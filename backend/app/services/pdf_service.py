"""
PDF rendering for the After Action Report.

Uses WeasyPrint with a Jinja2 HTML template. The PDF is intended to be a
respectable consultant deliverable: cover header with client/exercise/date,
section headers, and structured lists of strengths, gaps, recommendations,
and action items.
"""

from __future__ import annotations

from datetime import datetime
from io import BytesIO

from jinja2 import BaseLoader, Environment, select_autoescape
from weasyprint import HTML

from app.core.config import get_settings
from app.models.aar import AfterActionReport
from app.models.client import Client
from app.models.exercise import Exercise


_AAR_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>After Action Report — {{ exercise.title }}</title>
<style>
  @page {
    size: letter;
    margin: 0.75in 0.75in 0.85in 0.75in;
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: "Liberation Sans", sans-serif;
      font-size: 8.5pt;
      color: #94a3b8;
    }
    @bottom-left {
      content: "{{ company }} — Confidential";
      font-family: "Liberation Sans", sans-serif;
      font-size: 8.5pt;
      color: #94a3b8;
    }
  }
  body {
    font-family: "Liberation Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #0f172a;
    font-size: 10.5pt;
    line-height: 1.5;
    margin: 0;
  }

  /* ----- Cover header --------------------------------------------------- */
  .top-accent {
    height: 4px;
    background: linear-gradient(90deg, #10b981 0%, #047857 100%);
    margin: -0.1in -0.1in 18px;
  }
  header {
    margin-bottom: 22px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }
  .firm-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .logo-mark {
    display: inline-block;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: #064e3b;
    color: #d1fae5;
    text-align: center;
    line-height: 26px;
    font-family: "Liberation Mono", monospace;
    font-weight: 700;
    font-size: 13pt;
  }
  .firm-name {
    font-weight: 700;
    color: #0f172a;
    font-size: 11pt;
    letter-spacing: 0.02em;
  }
  .firm-tagline {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #64748b;
  }
  .doc-kicker {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #10b981;
    font-weight: 600;
    margin-bottom: 6px;
  }
  h1 {
    font-size: 22pt;
    color: #0f172a;
    margin: 0 0 14px 0;
    letter-spacing: -0.01em;
    font-weight: 600;
  }
  .meta {
    color: #475569;
    font-size: 10pt;
    line-height: 1.7;
  }
  .meta strong { color: #0f172a; font-weight: 600; }

  /* ----- Sections ------------------------------------------------------ */
  h2 {
    font-size: 13pt;
    color: #0f172a;
    margin: 24px 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  h2::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 11px;
    background: #10b981;
    margin-right: 8px;
    vertical-align: -1px;
    border-radius: 1px;
  }
  h3 { font-size: 11pt; color: #1e293b; margin: 14px 0 6px 0; font-weight: 600; }

  /* ----- Badges -------------------------------------------------------- */
  .badge {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 9999px;
    font-size: 8.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .badge-rating-excellent { background: #d1fae5; color: #065f46; }
  .badge-rating-satisfactory { background: #dbeafe; color: #1e3a8a; }
  .badge-rating-needs_improvement { background: #fef3c7; color: #92400e; }
  .badge-rating-unsatisfactory { background: #fee2e2; color: #991b1b; }

  .severity-critical { color: #991b1b; font-weight: 700; }
  .severity-high { color: #b45309; font-weight: 700; }
  .severity-medium { color: #1d4ed8; font-weight: 600; }
  .severity-low { color: #475569; }

  /* ----- Lists & tables ------------------------------------------------ */
  ul { margin: 4px 0 8px 18px; padding: 0; }
  ol { margin: 4px 0 8px 22px; padding: 0; }
  li { margin: 4px 0; }
  ul li::marker { color: #10b981; }

  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td {
    text-align: left;
    vertical-align: top;
    padding: 7px 9px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 10pt;
  }
  th {
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 9pt;
  }
  .placeholder { color: #94a3b8; font-style: italic; font-size: 10pt; }
  p { margin: 6px 0; }
</style>
</head>
<body>

<div class="top-accent"></div>

<header>
  <div class="firm-row">
    <span class="logo-mark">T</span>
    <div>
      <div class="firm-name">{{ company }}</div>
      <div class="firm-tagline">Cybersecurity Tabletop Exercise Program</div>
    </div>
  </div>

  <div class="doc-kicker">After Action Report</div>
  <h1>{{ exercise.title }}</h1>
  <div class="meta">
    <strong>Client:</strong> {{ client.name }}{% if client.industry %} &middot; {{ client.industry }}{% endif %}<br>
    <strong>Exercise type:</strong> {{ exercise.exercise_type.value | replace("_", " ") }}<br>
    <strong>Exercise date:</strong> {{ exercise.completed_date or exercise.scheduled_date or "—" }}<br>
    <strong>Report generated:</strong> {{ generated_on }}
    {% if aar.overall_rating %}
      <br><strong>Overall rating:</strong>
      <span class="badge badge-rating-{{ aar.overall_rating.value }}">
        {{ aar.overall_rating.value | replace("_", " ") }}
      </span>
    {% endif %}
  </div>
</header>

<h2>Executive Summary</h2>
{% if aar.executive_summary %}
  <p>{{ aar.executive_summary }}</p>
{% else %}
  <p class="placeholder">No executive summary recorded.</p>
{% endif %}

<h2>Strengths</h2>
{% if aar.strengths %}
  <ul>
    {% for item in aar.strengths %}<li>{{ item }}</li>{% endfor %}
  </ul>
{% else %}
  <p class="placeholder">No strengths recorded.</p>
{% endif %}

<h2>Gaps Identified</h2>
{% if aar.gaps_identified %}
  <table>
    <thead><tr><th>Gap</th><th style="width: 90px;">Severity</th><th>Evidence</th></tr></thead>
    <tbody>
      {% for g in aar.gaps_identified %}
        <tr>
          <td>{{ g.gap if g.gap else g.get("gap", "") }}</td>
          <td><span class="severity-{{ g.severity or 'medium' }}">{{ g.severity or "—" }}</span></td>
          <td>{{ g.evidence or "" }}</td>
        </tr>
      {% endfor %}
    </tbody>
  </table>
{% else %}
  <p class="placeholder">No gaps recorded.</p>
{% endif %}

<h2>Recommendations</h2>
{% if aar.recommendations %}
  <table>
    <thead><tr><th>Recommendation</th><th style="width: 80px;">Priority</th><th>Rationale</th></tr></thead>
    <tbody>
      {% for r in aar.recommendations %}
        <tr>
          <td>{{ r.recommendation or "" }}</td>
          <td><span class="severity-{{ r.priority or 'medium' }}">{{ r.priority or "—" }}</span></td>
          <td>{{ r.rationale or "" }}</td>
        </tr>
      {% endfor %}
    </tbody>
  </table>
{% else %}
  <p class="placeholder">No recommendations recorded.</p>
{% endif %}

<h2>Action Items</h2>
{% if aar.action_items %}
  <table>
    <thead><tr><th>Item</th><th>Owner</th><th style="width: 80px;">Priority</th><th style="width: 100px;">Due</th></tr></thead>
    <tbody>
      {% for a in aar.action_items %}
        <tr>
          <td>{{ a.item or "" }}</td>
          <td>{{ a.owner or "—" }}</td>
          <td><span class="severity-{{ a.priority or 'medium' }}">{{ a.priority or "—" }}</span></td>
          <td>{{ a.due_date or "—" }}</td>
        </tr>
      {% endfor %}
    </tbody>
  </table>
{% else %}
  <p class="placeholder">No action items recorded.</p>
{% endif %}

{% if aar.facilitator_notes %}
  <h2>Facilitator Notes</h2>
  <p>{{ aar.facilitator_notes }}</p>
{% endif %}

</body>
</html>
"""


def _env() -> Environment:
    return Environment(
        loader=BaseLoader(),
        autoescape=select_autoescape(["html", "xml"]),
    )


def render_aar_pdf(
    exercise: Exercise, client: Client, aar: AfterActionReport
) -> bytes:
    settings = get_settings()
    env = _env()
    template = env.from_string(_AAR_TEMPLATE)
    html_str = template.render(
        exercise=exercise,
        client=client,
        aar=aar,
        company=settings.company_name,
        generated_on=datetime.utcnow().strftime("%Y-%m-%d"),
    )
    buffer = BytesIO()
    HTML(string=html_str).write_pdf(target=buffer)
    return buffer.getvalue()
