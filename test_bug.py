import asyncio
from backend.services.gemini_service import analyze_pdf
from backend.schemas import EyeReportSchema
import os

async def test():
    # Use any dummy file
    with open("test_dummy.txt", "w") as f:
        f.write("Eye Report: IOP 22 mmHg, VA 6/6")
    with open("test_dummy.txt", "rb") as f:
        file_bytes = f.read()
    try:
        res = await analyze_pdf(file_bytes, report_type="eye_report")
        print(res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
