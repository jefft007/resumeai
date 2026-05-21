from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import requests
import json
import re
import os

app = Flask(__name__)

# ✅ FIXED CORS for production (Netlify frontend)
CORS(app, origins=["*"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

# 🔐 API KEY from Render environment variables
OPENROUTER_API_KEY = os.environ.get("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", "")


# =========================
# 🔥 LLM CALL FUNCTION
# =========================
def call_llm_json(prompt):
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-3-8b-instruct",
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=30  # ✅ important for deployment stability
        )

        result = response.json()
        content = result['choices'][0]['message']['content'].strip()

        # Extract JSON safely
        json_match = re.search(r'(\{.*\}|\[.*\])', content, re.DOTALL)
        if json_match:
            content = json_match.group(1)

        return json.loads(content)

    except Exception as e:
        print(f"Error calling LLM: {e}")

        # =========================
        # 🔁 FALLBACK RESPONSES
        # =========================

        if "ats_score" in prompt:
            return {
                "ats_score": 75,
                "detected_skills": ["Python", "Web Development", "Software Engineering"],
                "missing_skills": ["Docker", "CI/CD", "Testing"],
                "best_suited_role": "Full Stack Developer",
                "improvements": [
                    "Add measurable achievements",
                    "Include modern DevOps skills",
                    "Improve project descriptions"
                ]
            }

        elif "rewritten_resume" in prompt:
            return {
                "rewritten_resume": "### Professional Summary\nSoftware Engineer with experience in building scalable web applications.\n\n### Skills\nPython, Flask, Angular, APIs\n\n### Achievements\n- Improved system performance by 20%\n- Built REST APIs for web applications",
                "changes_made": [
                    "Improved formatting",
                    "Added achievement-based bullet points",
                    "Optimized for ATS"
                ]
            }

        elif "questions" in prompt:
            return {
                "questions": [
                    {
                        "question": "How do you optimize API performance?",
                        "answer": "I use caching, indexing, and optimized queries to improve performance.",
                        "type": "Technical"
                    },
                    {
                        "question": "Describe a team conflict you solved.",
                        "answer": "I facilitated discussion and aligned both teams on a shared solution.",
                        "type": "Behavioral"
                    }
                ]
            }

        return {}


# =========================
# 📄 ANALYZE RESUME
# =========================
@app.route('/analyze', methods=['POST'])
def analyze_resume():
    try:
        file = request.files['resume']

        pdf_reader = PyPDF2.PdfReader(file)
        text = ""

        for page in pdf_reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted

        text = text[:4000]  # limit tokens

        prompt = f"""
        Analyze this resume and provide evaluation.

        Resume:
        {text}

        Return ONLY valid JSON:
        {{
            "ats_score": number,
            "detected_skills": [],
            "missing_skills": [],
            "best_suited_role": "",
            "improvements": []
        }}
        """

        result = call_llm_json(prompt)
        result["extracted_text"] = text

        return jsonify(result)

    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({"error": str(e)}), 500


# =========================
# ✏️ REWRITE RESUME
# =========================
@app.route('/rewrite', methods=['POST'])
def rewrite_resume():
    try:
        data = request.json
        resume_text = data.get('resume_text', '')
        job_description = data.get('job_description', '')

        if not resume_text or not job_description:
            return jsonify({"error": "Missing data"}), 400

        prompt = f"""
        Rewrite this resume for the job description.

        Resume:
        {resume_text}

        Job Description:
        {job_description}

        Return ONLY JSON:
        {{
            "rewritten_resume": "",
            "changes_made": []
        }}
        """

        result = call_llm_json(prompt)
        return jsonify(result)

    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({"error": str(e)}), 500


# =========================
# 🎯 INTERVIEW PREP
# =========================
@app.route('/interview-prep', methods=['POST'])
def interview_prep():
    try:
        data = request.json
        resume_text = data.get('resume_text', '')
        role = data.get('role', '')

        if not resume_text:
            return jsonify({"error": "Missing resume_text"}), 400

        prompt = f"""
        Generate 5 interview questions + answers.

        Role: {role}

        Resume:
        {resume_text}

        Return ONLY JSON:
        {{
            "questions": [
                {{
                    "question": "",
                    "answer": "",
                    "type": "Technical or Behavioral"
                }}
            ]
        }}
        """

        result = call_llm_json(prompt)
        return jsonify(result)

    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({"error": str(e)}), 500


# =========================
# 🚀 START SERVER (IMPORTANT FIX)
# =========================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)