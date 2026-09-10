import os
import json
import re
import io
import PyPDF2
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Load and validate Gemini API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file")

# Configure Gemini with the API key
genai.configure(api_key=api_key)

# Log key loading status (first 10 chars only for security)
print(f"[OK] Gemini API Key loaded: {api_key[:10]}...")
print(f"  Key length: {len(api_key)} characters")

# List all available Gemini models and select the first one that supports generateContent
print("\n" + "="*60)
print("[INFO] Available Gemini Models for Your API Key:")
print("="*60)

selected_model = None
try:
    models = genai.list_models()
    for m in models:
        print(f"  * {m.name}")
        # Select first model that supports generateContent
        if selected_model is None and "generateContent" in m.supported_generation_methods:
            selected_model = m.name
except Exception as e:
    print(f"  Error listing models: {e}")
    selected_model = "gemini-1.5-flash"  # Fallback

print("="*60)
print(f"[OK] Selected Gemini Model: {selected_model}")
print("="*60 + "\n")

PROMPT_BLOOD = """
Extract ALL medical data from this report.
Focus on: Hemoglobin, Glucose (Fasting/Post-Prandial), HbA1c, Cholesterol (Total, LDL, HDL, VLDL, Triglycerides), Blood Pressure, Liver enzymes (ALT/SGPT, AST/SGOT, ALP, Bilirubin), Kidney (Creatinine, Urea/BUN, Uric Acid), CBC (RBC, WBC, Platelets, MCV, MCH, MCHC), Vitamin D, Vitamin B12, Thyroid (TSH, T3, T4), Iron studies, and any other biomarkers present.

Return ONLY a JSON object with this structure:
{
  "patient_info": {
    "name": "Full patient name",
    "age": "Age with unit e.g. 20 Years",
    "gender": "Male or Female",
    "patient_id": "Patient ID or UHID if available",
    "doctor_name": "Referring doctor name if available",
    "report_date": "Date as printed on the report"
  },
  "biomarkers": [
    {"name": "Hemoglobin", "value": 14.2, "unit": "g/dL", "reference_range": "13.5-17.5", "status": "Normal", "interpretation": "Your hemoglobin is within optimal range."},
    {"name": "Vitamin D", "value": 18.5, "unit": "ng/mL", "reference_range": "30-100", "status": "Low", "interpretation": "Your Vitamin D level is below the sufficient range."}
  ],
  "health_score": 85,
  "summary": "1. Overall health status.\\n2. Key normal findings.\\n3. Key concerns.\\n4. What patient should do next.\\n(Provide strictly 4-6 concise bullet points using easy language.)",
  "recommendations": [
    "Concrete, actionable step 1 to address the specific abnormal biomarker (e.g., Vitamin D)",
    "Concrete, actionable step 2...",
    "Concrete, actionable step 3..."
  ],
  "disease_explanations": [
    {"disease_name": "Medical Term/Condition", "simple_explanation": "Explain it simply using layman's terms and analogies so even a child could understand."}
  ]
}
Extract patient_info from the report header. If a biomarker value is missing, omit it. Set status to exactly Normal, High, or Low.
For recommendations, provide 3 to 4 highly specific, actionable points on how to cure/treat the specific abnormal values found in this report. Do not give generic advice if abnormalities are present.
"""

PROMPT_EYE = """
You are an expert ophthalmologist AI. Extract ALL medical data from this Eye / Vision report with maximum accuracy and depth.

Extract: Visual Acuity (uncorrected and corrected for both eyes), Intraocular Pressure (both eyes), Refraction data (Sphere, Cylinder, Axis, Add Power for near), Colour Vision test result, Cover test, Stereopsis, Pupil assessment, Anterior segment findings, Posterior segment findings (retina, optic disc, macula, vessels), Pachymetry (corneal thickness), Tonometry method, any diagnosed conditions.

Return ONLY a valid JSON object with EXACTLY this structure. No extra keys. No markdown:
{
  "report_type": "eye_report",
  "patient_info": {
    "name": "Full patient name from header",
    "age": "Age with unit e.g. 30 Years",
    "gender": "Male or Female",
    "patient_id": "Patient ID if available, else null",
    "doctor_name": "Referring doctor name if available, else null",
    "report_date": "Report date as printed"
  },
  "visual_acuity_right": "e.g., 6/6 or 20/20",
  "visual_acuity_left": "e.g., 6/9 or 20/30",
  "intraocular_pressure": "e.g., 21.5 mmHg (Left), 22.5 mmHg (Right)",
  "corneal_thickness": "e.g., 545 μm",
  "tear_film_breakup_time": "e.g., 4 sec",
  "cup_to_disc_ratio": "e.g., 0.35",
  "prescription": {
    "sph_right": "-1.25",
    "cyl_right": "-0.50",
    "axis_right": "180",
    "sph_left": "-1.00",
    "cyl_left": "0.00",
    "axis_left": ""
  },
  "eye_metrics": [
    {"metric": "IOP Right", "value": 22.5, "unit": "mmHg", "reference_range": "10-21", "status": "High"},
    {"metric": "IOP Left", "value": 21.5, "unit": "mmHg", "reference_range": "10-21", "status": "High"},
    {"metric": "VA Right (Unaided)", "value": 6, "unit": "/6", "reference_range": "6/6 - 6/9", "status": "Normal"},
    {"metric": "VA Left (Unaided)", "value": 6, "unit": "/6", "reference_range": "6/6 - 6/9", "status": "Normal"},
    {"metric": "Sphere Right", "value": -0.5, "unit": "D", "reference_range": "-0.25 to +0.25", "status": "Low"},
    {"metric": "Sphere Left", "value": 0.0, "unit": "D", "reference_range": "-0.25 to +0.25", "status": "Normal"},
    {"metric": "Cylinder Right", "value": -0.25, "unit": "D", "reference_range": "0 to -0.25", "status": "Normal"},
    {"metric": "Cylinder Left", "value": 0.0, "unit": "D", "reference_range": "0 to -0.25", "status": "Normal"}
  ],
  "findings": [
    "Bilateral mild myopia with low astigmatism in the right eye, fully correctable to normal vision.",
    "Borderline elevated IOP in both eyes."
  ],
  "health_score": 82,
  "summary": "1. Overall vision status summary.\\n2. Key abnormal findings.\\n3. What the patient should do immediately.\\n4. Follow-up recommendation.",
  "vision_summary": [
    "✓ Vision can be corrected to normal using glasses.",
    "⚠ Eye pressure is slightly elevated and should be monitored.",
    "⚠ Mild dry eyes are present.",
    "✓ Optic nerve and retina are largely healthy."
  ],
  "recommendations": [
    "Specific recommendation addressing IOP elevation — e.g., schedule a glaucoma evaluation within 4 weeks.",
    "Specific recommendation for myopia — e.g., get updated glasses/contact lens prescription.",
    "Lifestyle advice specific to the findings — e.g., limit screen time, take eye breaks every 20 minutes.",
    "Follow-up schedule — e.g., recheck IOP in 3 months."
  ],
  "follow_up_timeline": [
    {"condition": "Dry Eye Review", "timeline": "1 Month"},
    {"condition": "IOP Check", "timeline": "3 Months"},
    {"condition": "Retinal Examination", "timeline": "12 Months"}
  ],
  "anatomy_issues": [
    {"region": "Cornea", "color": "green"},
    {"region": "Lens", "color": "green"},
    {"region": "Retina", "color": "red"},
    {"region": "Optic Nerve", "color": "orange"},
    {"region": "Macula", "color": "green"}
  ],
  "disease_explanations": [
    {
      "disease_name": "Myopia (Short-sightedness)",
      "severity": "Mild",
      "status": "Abnormal",
      "simple_explanation": "What it means\\nYou have difficulty seeing distant objects clearly.\\n\\nCommon causes\\nEye shape causes light to focus incorrectly.\\n\\nWhat to do\\nWear prescribed glasses and attend annual eye exams.",
      "treatment": "List specific treatments: e.g., single-vision glasses with exact power if available, orthokeratology, atropine drops for children, LASIK eligibility criteria.",
      "urgency": "Routine / Soon / Urgent"
    }
  ]
}

IMPORTANT RULES:
- prescription: Extract the eyeglasses prescription if present (SPH, CYL, AXIS for both eyes). If absent, omit the prescription key entirely or leave fields null.
- eye_metrics: Include EVERY measurable parameter from the report (IOP both eyes, VA both eyes, sphere/cylinder/axis/add if available). Set status to exactly Normal, High, or Low based on clinical norms.
- IOP normal range is 10-21 mmHg. Above 21 = High.
- VA 6/6 or 6/9 = Normal. 6/12 = Mild reduction. 6/18+ = Significant.
- disease_explanations: Include an entry for EVERY diagnosed condition or abnormal finding. The `simple_explanation` MUST BE EXTREMELY CONCISE and strictly follow the 3-section format: 'What it means\\n[1 sentence]\\n\\nCommon causes\\n[1 sentence]\\n\\nWhat to do\\n[1 sentence]'. Do not write a long paragraph. The `severity` must be one of: 'Mild', 'Borderline', 'Moderate', or 'Severe'.
- anatomy_issues: Map the findings to their affected regions (Cornea, Lens, Retina, Optic Nerve, Macula). Assign "green" if healthy, "orange" if borderline/moderate, and "red" if severely affected. Always include the 5 main regions even if they are all green.
- health_score: Calculate carefully. 90-100 = perfect vision, 70-89 = minor correctable issues, 50-69 = moderate concerns, below 50 = significant problems.
- Extract patient_info from the report header.
"""

PROMPT_ECG = """
You are an expert Cardiologist AI. Extract ALL medical data from this ECG / Electrocardiogram report with maximum clinical accuracy.

Extract every measurable ECG parameter: Heart Rate, Rhythm Type, PR Interval, QRS Duration, QTc Interval, P Wave axis, QRS Axis, ST Segment status, T Wave status, and any specific abnormalities or diagnoses mentioned.

Return ONLY a valid JSON object with EXACTLY this structure. No extra keys. No markdown:
{
  "report_type": "ecg_heart",
  "patient_info": {
    "name": "Full patient name from header",
    "age": "Age with unit e.g. 30 Years",
    "gender": "Male or Female",
    "patient_id": "Patient ID if available, else null",
    "doctor_name": "Referring doctor name if available, else null",
    "report_date": "Report date as printed"
  },
  "heart_rate": 75,
  "rhythm_type": "Normal Sinus Rhythm",
  "pr_interval": "160 ms",
  "qtc_interval": "410 ms",
  "ecg_metrics": [
    {"metric": "Heart Rate", "value": 75, "unit": "bpm", "reference_range": "60-100", "status": "Normal"},
    {"metric": "PR Interval", "value": 160, "unit": "ms", "reference_range": "120-200", "status": "Normal"},
    {"metric": "QRS Duration", "value": 88, "unit": "ms", "reference_range": "60-100", "status": "Normal"},
    {"metric": "QTc Interval", "value": 410, "unit": "ms", "reference_range": "350-440", "status": "Normal"},
    {"metric": "P Wave Axis", "value": 60, "unit": "degrees", "reference_range": "0-75", "status": "Normal"},
    {"metric": "QRS Axis", "value": 45, "unit": "degrees", "reference_range": "-30 to +90", "status": "Normal"},
    {"metric": "ST Segment", "value": 0, "unit": "mm", "reference_range": "-0.5 to +1", "status": "Normal"},
    {"metric": "T Wave Amplitude", "value": 0.3, "unit": "mV", "reference_range": "0.1-0.5", "status": "Normal"}
  ],
  "abnormalities": [
    "Describe each abnormality found in one clear sentence",
    "Or write 'No significant abnormalities detected' if all is normal"
  ],
  "health_score": 90,
  "summary": "1. Overall heart rhythm and conduction status.\\n2. Key abnormal findings if any.\\n3. What the patient must do immediately.\\n4. Follow-up recommendation.",
  "simple_summary": "A 3-4 sentence plain-english summary meant for the patient. E.g. 'Your heart is beating slightly faster than normal. Some electrical signals are delayed. These findings are not immediately dangerous but should be reviewed by a cardiologist.'",
  "recommendations": [
    "Highly specific recommendation 1 addressing the exact abnormality found (e.g., 'Consult a cardiologist within 2 weeks for prolonged QTc evaluation — avoid QT-prolonging medications')",
    "Specific recommendation 2 (e.g., 'Monitor blood pressure and cholesterol — both directly affect cardiac rhythm')",
    "Lifestyle recommendation specific to findings (e.g., 'Avoid caffeine and alcohol which can trigger PVCs')",
    "Follow-up schedule (e.g., 'Repeat ECG in 3 months to track any changes')"
  ],
  "disease_explanations": [
    {
      "disease_name": "Condition name exactly as found in report",
      "severity": "Mild / Moderate / Severe",
      "status": "Abnormal",
      "simple_explanation": "Explain what this heart condition is using a child-friendly analogy. Include: (1) What it is — use an everyday analogy like electrical wires, plumbing, or a drum beat. (2) Why it happens — what causes it. (3) How it affects the patient's daily life and what symptoms they may feel. (4) Is it dangerous right now or something to watch? (5) What can the patient do in their daily life to manage it? Minimum 80 words.",
      "treatment": "List specific treatments and next steps: which specialist to see, what tests to do next (e.g., Holter monitor, Echo, stress test), medications if relevant, and lifestyle changes. Be very specific — avoid generic advice.",
      "urgency": "Routine / Soon / Urgent"
    }
  ]
}

IMPORTANT RULES:
- ecg_metrics: Include EVERY numeric parameter from the report. Set status to exactly Normal, High, or Low using clinical reference ranges.
  - Heart Rate: 60-100 bpm normal. Below 60 = Low (Bradycardia). Above 100 = High (Tachycardia).
  - PR Interval: 120-200 ms normal. Above 200 ms = High (1st degree AV block).
  - QRS Duration: 60-100 ms normal. Above 120 ms = High (Bundle Branch Block territory).
  - QTc Interval: up to 440 ms (male), 450 ms (female) normal. Above = High (Long QT risk).
  - ST Segment: -0.5 to +1 mm normal. Above +1 = High (possible ischemia/STEMI). Below -0.5 = Low (possible ischemia/strain).
- disease_explanations: Create one entry for EVERY abnormality or diagnosed condition. If rhythm is normal, create one entry confirming it with a brief explanation of what a healthy ECG means. Minimum 80 words per explanation.
- health_score: 90-100 = perfectly normal ECG. 70-89 = minor findings worth monitoring. 50-69 = moderate concerns needing cardiology review. Below 50 = significant abnormalities requiring urgent attention.
- Extract patient_info from the report header.
"""

PROMPT_GYNO = """
You are an expert Gynecologist and Obstetrician AI. Analyze the uploaded Gynecology, Maternity, or Pregnancy ultrasound/blood report.
Extract all relevant information and map it into the requested JSON schema.

JSON FORMAT:
{
  "report_type": "gyno_report",
  "patient_info": {
    "name": "string",
    "age": "string",
    "gender": "string",
    "patient_id": "string",
    "doctor_name": "string",
    "report_date": "string",
    "gestational_age": "string (e.g. '24 Weeks 3 Days' if available)",
    "expected_delivery_date_edd": "string (if available)",
    "gravida_para": "string (e.g. 'G2 P1' if available)"
  },
  "gyno_subtype": "pregnancy_ultrasound or hormonal_profile or general_gyno",
  "fetal_heart_rate": "string (e.g. '140 bpm' if available)",
  "gyno_metrics": [
    {
      "metric": "Metric name (e.g. Biparietal Diameter, Femur Length, FSH)",
      "value": "Numeric or string value",
      "unit": "Unit if present",
      "reference_range": "Normal range if present",
      "status": "Normal, High, or Low"
    }
  ],
  "findings": [
    "Clear sentence about specific findings (e.g., Placenta is anterior, AFI is normal)."
  ],
  "disease_explanations": [
    {
      "disease_name": "Specific condition or observation (e.g. Gestational Diabetes, Placenta Previa, Healthy Fetal Growth)",
      "severity": "Normal / Mild / Moderate / Severe",
      "status": "Normal or Abnormal",
      "simple_explanation": "What it means\\n[1 sentence]\\n\\nCommon causes\\n[1 sentence]\\n\\nWhat to do\\n[1 sentence]",
      "treatment": "Specific action, monitoring, or treatment plan.",
      "urgency": "Routine / Soon / Urgent"
    }
  ],
  "health_score": 90,
  "summary": "1. Overall summary.\\n2. Key findings.\\n3. Recommendations.",
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2"
  ],
  "follow_up_timeline": [
    {"condition": "Anomaly Scan", "timeline": "4 Weeks"}
  ]
}

IMPORTANT RULES:
- gyno_metrics: Include every maternal and fetal metric (BPD, HC, AC, FL, AFI, EFW, hormone levels).
- disease_explanations: Create one entry for every significant finding or condition. Follow the precise format: 'What it means\\n...\\n\\nCommon causes\\n...\\n\\nWhat to do\\n...'. 
- health_score: Provide a score out of 100 based on fetal and maternal health markers.
"""

PROMPT_ROUTER = {
    "blood_test": PROMPT_BLOOD,
    "eye_report": PROMPT_EYE,
    "ecg_heart": PROMPT_ECG,
    "gyno_report": PROMPT_GYNO
}


# -- Deterministic Health Score Calculator --
# This completely replaces Gemini's probabilistic health_score with a
# math-based algorithm so the same report always gives the same number.

import re as _re

# Biomarkers with 2x weight because they are clinically critical
_CRITICAL_MARKERS = {
    'hemoglobin', 'hba1c', 'hb', 'glucose', 'fasting blood glucose',
    'fasting glucose', 'blood glucose', 'creatinine', 'total cholesterol',
    'cholesterol', 'ldl', 'hdl', 'tsh', 'vitamin d', 'urea', 'bun',
    'platelet', 'wbc', 'rbc', 'sodium', 'potassium',
}

def _parse_ref_range(ref_str: str):
    """
    Parse a reference range string into a (lo, hi) float tuple.
    Handles: "13.5-17.5", "4,500-10,000", ">30", ">=30", "<200", "<=200".
    Returns None if parsing fails.
    """
    if not ref_str:
        return None
    s = str(ref_str).replace(',', '').strip()

    # Range: "13.5-17.5" or "4500-10000"
    m = _re.match(r'^([\d.]+)\s*[-]\s*([\d.]+)$', s)
    if m:
        lo, hi = float(m.group(1)), float(m.group(2))
        if lo <= hi:
            return lo, hi

    # Greater-than: ">30" or ">=30"
    m = _re.match(r'^[>]=?\s*([\d.]+)$', s)
    if m:
        threshold = float(m.group(1))
        return threshold, threshold * 2.5   # synthetic upper bound

    # Less-than: "<200" or "<=200"
    m = _re.match(r'^[<]=?\s*([\d.]+)$', s)
    if m:
        threshold = float(m.group(1))
        return 0.0, threshold

    return None


def _score_single_biomarker(bm: dict) -> float:
    """
    Score one biomarker on a 0-100 scale.

    Normal  â†’ 100
    Abnormal with parseable range â†’ graduated score based on % deviation:
        deviation  0 % beyond boundary â†’ 100
        deviation 50 % beyond boundary â†’ 80
        deviation 100 % beyond boundary â†’ 60
        deviation 200 % beyond boundary â†’ 30
        extreme deviation              â†’ min 10
    Abnormal without parseable range â†’ 55 (flat penalty)
    """
    status = (bm.get('status') or '').strip().upper()

    if status == 'NORMAL':
        return 100.0

    # Try to compute a deviation-based score
    try:
        raw_value = str(bm.get('value', '')).replace(',', '')
        value = float(raw_value)
        ref = _parse_ref_range(str(bm.get('reference_range', '')))

        if ref:
            lo, hi = ref
            range_width = hi - lo

            if range_width > 0:
                if value < lo:
                    # How many range-widths below the lower bound?
                    excess = (lo - value) / range_width
                elif value > hi:
                    excess = (value - hi) / range_width
                else:
                    return 100.0  # value is actually within range

                # Penalty curve: steep at first, tapering
                # excess=0 â†’ 0 penalty; excess=1 â†’ 40; excess=2 â†’ 60; excess=4 â†’ 75
                penalty = min(90, excess * 40)
                return max(10.0, round(100.0 - penalty, 1))
    except (ValueError, TypeError, ZeroDivisionError):
        pass

    # Fallback: abnormal but we can't compute deviation
    return 55.0


def calculate_health_score(biomarkers: list) -> int:
    """
    Deterministic health score (0-100) from a list of biomarker dicts.

    Weighted average where:
    - Critical biomarkers (see _CRITICAL_MARKERS) have weight 2.0
    - All others have weight 1.0
    """
    if not biomarkers:
        return 100

    total_weighted = 0.0
    total_weight   = 0.0

    for bm in biomarkers:
        name   = (bm.get('name') or '').lower()
        weight = 2.0 if any(crit in name for crit in _CRITICAL_MARKERS) else 1.0
        score  = _score_single_biomarker(bm)

        total_weighted += score * weight
        total_weight   += weight

    if total_weight == 0:
        return 100

    final = total_weighted / total_weight
    return max(0, min(100, round(final)))

def calculate_ecg_health_score(result: dict) -> int:
    """
    Deterministic health score (0-100) for ECG reports.
    Evaluates Heart Rate, Rhythm, PR, QRS, QTc, ST Segment, T Wave, and Abnormalities.
    """
    score = 100
    
    # 1. Heart Rate
    hr = result.get('heart_rate')
    if hr is not None:
        try:
            hr_val = int(hr)
            if hr_val < 50 or hr_val > 120:
                score -= 5
        except (ValueError, TypeError):
            pass
            
    # 2. Rhythm Type
    rhythm = str(result.get('rhythm_type', '')).lower()
    if 'ventricular tachycardia' in rhythm or 'v-tach' in rhythm:
        score -= 20
    elif 'atrial fibrillation' in rhythm or 'a-fib' in rhythm or 'afib' in rhythm:
        score -= 15
    elif rhythm and 'normal sinus' not in rhythm and 'normal' not in rhythm:
        score -= 5
        
    # 3. Metrics (QTc, ST Segment, etc.)
    st_elevation = False
    qtc_prolonged = False
    
    metrics = result.get('ecg_metrics', [])
    for m in metrics:
        name = str(m.get('metric', '')).lower()
        status = str(m.get('status', '')).lower()
        
        if 'qtc' in name and status == 'high':
            qtc_prolonged = True
        elif 'st' in name and status == 'high':
            st_elevation = True
        elif status == 'high' or status == 'low':
            # Minor penalty for other abnormal metrics (e.g. prolonged PR, wide QRS)
            score -= 2
            
    if qtc_prolonged:
        score -= 5
    if st_elevation:
        score -= 15
        
    # 4. Abnormalities
    abnorms = result.get('abnormalities', [])
    for ab in abnorms:
        ab_str = str(ab).lower()
        if 'no significant' in ab_str or 'normal' in ab_str:
            continue
        # Additional penalty per distinct abnormality
        score -= 2

    return max(40, min(100, int(score)))

def calculate_gyno_health_score(result: dict) -> int:
    score = 100
    metrics = result.get('gyno_metrics') or []
    for m in metrics:
        status = str(m.get('status', '')).lower()
        if status in ['high', 'low', 'abnormal']:
            score -= 4
            
    findings = result.get('disease_explanations') or []
    for f in findings:
        status = str(f.get('status', '')).lower()
        if status == 'abnormal':
            score -= 10
            
    return max(40, min(100, int(score)))

# -- Report Classification Router --

CLASSIFICATION_PROMPT = """
You are a medical document classifier. Read the following text extracted from the first page of a medical report.
Classify it into exactly one of the following categories:
- blood_test
- ecg_heart
- bone_density
- eye_report
- dental_report
- xray_report
- mri_report
- ct_scan
- gyno_report
- ear_report
- dermato_report
- general_report
- unsupported

Return ONLY a JSON object in this exact format:
{
  "report_type": "blood_test"
}
Hint: If the report mentions "Gestational", "EDD", "Fetus", "Ovary", "Ultrasound", or "Pregnancy", strongly consider classifying it as "gyno_report".
If you are unsure or the confidence is low, return "unsupported".
"""

async def classify_report(file_bytes: bytes) -> str:
    """Extracts the first page of the PDF and uses Gemini to classify the report type."""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        first_page_text = reader.pages[0].extract_text()
    except Exception as e:
        print(f"[WARNING] Failed to extract text for classification: {e}")
        first_page_text = ""

    model = genai.GenerativeModel(selected_model)
    response = model.generate_content(
        [
            CLASSIFICATION_PROMPT,
            first_page_text[:2000] # Send up to 2000 characters of the first page
        ],
        generation_config={"response_mime_type": "application/json"}
    )
    
    try:
        text_response = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(text_response)
        return result.get("report_type", "unsupported")
    except Exception as e:
        print(f"[WARNING] Classification JSON parse failed: {e}")
        return "unsupported"


# -- Gemini analysis function --

async def analyze_pdf(file_bytes: bytes, report_type: str = "blood_test"):
    model = genai.GenerativeModel(selected_model)

    # Get specific prompt based on report type
    selected_prompt = PROMPT_ROUTER.get(report_type, PROMPT_BLOOD)

    # Send PDF to Gemini with JSON response forced
    response = model.generate_content(
        [
            selected_prompt,
            {"mime_type": "application/pdf", "data": file_bytes}
        ],
        generation_config={"response_mime_type": "application/json"}
    )

    # Clean and parse JSON
    text_response = response.text.replace('```json', '').replace('```', '').strip()
    result = json.loads(text_response)

    # -- Inject the report_type to satisfy the Pydantic Union Discriminator --
    result['report_type'] = report_type

    # -- Override Gemini's probabilistic health_score with our deterministic one --
    if report_type == "blood_test":
        biomarkers = result.get('biomarkers', [])
        deterministic_score = calculate_health_score(biomarkers)
        result['health_score'] = deterministic_score

        print(f"[OK] Deterministic health score: {deterministic_score}/100  "
              f"(Gemini suggested: {result.get('_gemini_score', 'N/A')})")
    elif report_type == "ecg_heart":
        deterministic_score = calculate_ecg_health_score(result)
        result['health_score'] = deterministic_score
        print(f"[OK] Deterministic ECG score: {deterministic_score}/100")
    elif report_type == "gyno_report":
        deterministic_score = calculate_gyno_health_score(result)
        result['health_score'] = deterministic_score
        print(f"[OK] Deterministic Gyno score: {deterministic_score}/100")
    else:
        # Fallback for future reports before they have custom scoring
        result['health_score'] = result.get('health_score', 80)

    return result

