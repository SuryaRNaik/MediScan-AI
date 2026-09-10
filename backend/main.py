from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.gemini_service import analyze_pdf, classify_report
from schemas import MedicalAnalysis
import os
import traceback
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Medical Report Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Verify API configuration on startup"""
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        print(f"\n[OK] API Key Status: LOADED")
        print(f"  First 10 chars: {api_key[:10]}...")
        print(f"  Total length: {len(api_key)} characters\n")
    else:
        print("\n[WARNING] GEMINI_API_KEY not found in .env\n")

@app.post("/analyze", response_model=MedicalAnalysis)
async def analyze_report(file: UploadFile = File(...)):
    """Analyze medical PDF report with full error logging"""
    try:
        # Validate file format
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        print(f"\n[INFO] Processing file: {file.filename}")
        
        # Read and analyze file
        content = await file.read()
        print(f"[INFO] File size: {len(content)} bytes")
        
        # STEP 1: Classify report type
        report_type = await classify_report(content)
        print(f"[OK] Report classified as: {report_type}")
        
        if report_type not in ["blood_test", "eye_report", "ecg_heart", "gyno_report"]:
            type_names = {
                "ecg_heart": "ECG Report",
                "bone_density": "Bone Density Report",
                "eye_report": "Eye Report",
                "dental_report": "Dental Report",
                "xray_report": "X-Ray Report",
                "mri_report": "MRI Report",
                "ct_scan": "CT Scan Report",
                "gyno_report": "Gynecology Report",
                "ear_report": "Ear Report",
                "dermato_report": "Dermatology Report",
                "general_report": "General Medical Report",
                "unsupported": "Unsupported Document"
            }
            friendly_name = type_names.get(report_type, report_type.replace('_', ' ').title())
            
            error_msg = (
                f"Detected Report Type: {friendly_name}\n\n"
                "This report type is currently not supported.\n\n"
                "Supported:\n"
                "✓ Blood Reports\n"
                "✓ Health Checkup Reports\n\n"
                "Coming Soon:\n"
                "• Eye Reports\n"
                "• ECG Reports\n"
                "• MRI Reports\n"
                "• X-Ray Reports"
            )
            raise HTTPException(
                status_code=422,
                detail=error_msg
            )
        
        # Step 2: Proceed with dynamic report analysis
        analysis_result = await analyze_pdf(content, report_type)
        print(f"[OK] Analysis complete. Health score: {analysis_result.get('health_score', 'N/A')}")
        
        return analysis_result
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log full traceback for debugging
        print("\n" + "="*60)
        print("[ERROR] OCCURRED IN /analyze ENDPOINT")
        print("="*60)
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print("\nFull Traceback:")
        print("-"*60)
        traceback.print_exc()
        print("-"*60 + "\n")
        
        raise HTTPException(
            status_code=500, 
            detail=f"Analysis failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
