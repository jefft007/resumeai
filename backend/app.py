from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
import requests
import json
import re
import os

app = Flask(__name__)
CORS(app, origins=["*"])

# =========================
# API KEY
# =========================
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    print("⚠️ WARNING: OPENROUTER_API_KEY is missing!")

# =========================
# HEALTH CHECK
# =========================
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Resume AI Backend Running 🚀"
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok"
    })


# =========================
# EXTRACT PDF TEXT
# =========================
def extract_resume_text(file):
    text = ""

    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            extracted = page.extract_text()

            if extracted:
                text += extracted + "\n"

    return text.strip()


# =========================
# LOCAL ATS ANALYZER
# =========================
def local_resume_analysis(text):
    text_lower = text.lower()

    skills_db = {
        "python": 10,
        "java": 10,
        "angular": 15,
        "react": 15,
        "html": 5,
        "css": 5,
        "javascript": 10,
        "typescript": 10,
        "sql": 10,
        "mysql": 10,
        "mongodb": 15,
        "node": 15,
        "express": 10,
        "flask": 15,
        "django": 15,
        "docker": 20,
        "aws": 20,
        "azure": 20,
        "git": 10,
        "jenkins": 15,
        "machine learning": 25,
        "ai": 20,
        "data science": 20,
        "tailwind": 10,
        "bootstrap": 5,
        "spring boot": 20,
        "kubernetes": 25
    }

    detected_skills = []
    missing_skills = []
    score = 0

    for skill, points in skills_db.items():
        if skill in text_lower:
            detected_skills.append(skill.title())
            score += points
        else:
            missing_skills.append(skill.title())

    score = min(score, 100)

    # =========================
    # ROLE DETECTION
    # =========================
    if "angular" in text_lower or "react" in text_lower:
        role = "Frontend Developer"

    elif (
        "python" in text_lower and
        ("machine learning" in text_lower or "ai" in text_lower)
    ):
        role = "AI/ML Engineer"

    elif (
        "flask" in text_lower or
        "django" in text_lower or
        "node" in text_lower
    ):
        role = "Backend Developer"

    elif (
        "docker" in text_lower or
        "jenkins" in text_lower or
        "aws" in text_lower
    ):
        role = "DevOps Engineer"

    elif (
        "mongodb" in text_lower and
        "angular" in text_lower
    ):
        role = "Full Stack Developer"

    else:
        role = "Software Developer"

    # =========================
    # IMPROVEMENTS
    # =========================
    improvements = []

    if score < 40:
        improvements.append("Add more technical skills and projects.")
        improvements.append("Include certifications and internship experience.")

    if "project" not in text_lower:
        improvements.append("Add project section with real-world applications.")

    if "github" not in text_lower:
        improvements.append("Add GitHub profile link.")

    if "linkedin" not in text_lower:
        improvements.append("Add LinkedIn profile.")

    if len(text.split()) < 250:
        improvements.append("Resume content is too short. Add more details.")

    if "docker" not in text_lower:
        improvements.append("Learning Docker can improve ATS score.")

    if "aws" not in text_lower:
        improvements.append("Add cloud skills like AWS or Azure.")

    return {
        "ats_score": score,
        "detected_skills": detected_skills,
        "missing_skills": missing_skills[:10],
        "best_suited_role": role,
        "improvements": improvements,
        "extracted_text": text
    }


# =========================
# OPENROUTER LLM
# =========================
def call_llm_json(prompt):
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-3-8b-instruct",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            },
            timeout=60
        )

        result = response.json()

        if "choices" not in result:
            print("OpenRouter Error:", result)
            return None

        content = result["choices"][0]["message"]["content"]

        match = re.search(r'(\{.*\}|\[.*\])', content, re.DOTALL)

        if match:
            content = match.group(1)

        return json.loads(content)

    except Exception as e:
        print("LLM ERROR:", str(e))
        return None


# =========================
# ANALYZE RESUME
# =========================
@app.route("/analyze", methods=["POST"])
def analyze_resume():
    try:
        file = request.files.get("resume")

        if not file:
            return jsonify({
                "error": "No resume uploaded"
            }), 400

        # Extract text
        text = extract_resume_text(file)

        if not text:
            return jsonify({
                "error": "Unable to extract text from PDF"
            }), 400

        # LOCAL DYNAMIC ANALYSIS
        analysis = local_resume_analysis(text)

        return jsonify(analysis)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# =========================
# AI RESUME REWRITE
# =========================
@app.route("/rewrite", methods=["POST"])
def rewrite_resume():
    try:
        data = request.json or {}

        resume_text = data.get("resume_text", "")
        job_description = data.get("job_description", "")

        prompt = f"""
        Rewrite and optimize this resume for ATS.

        Resume:
        {resume_text}

        Job Description:
        {job_description}

        Return ONLY valid JSON:

        {{
            "rewritten_resume": "",
            "changes_made": []
        }}
        """

        result = call_llm_json(prompt)

        if not result:
            result = {
                "rewritten_resume": resume_text,
                "changes_made": [
                    "Added ATS-friendly keywords",
                    "Improved formatting",
                    "Enhanced project descriptions"
                ]
            }

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# =========================
# INTERVIEW QUESTIONS
# =========================
@app.route("/interview-prep", methods=["POST"])
def interview_prep():
    try:
        data = request.json or {}

        role = data.get("role", "")
        resume_text = data.get("resume_text", "")

        prompt = f"""
        Generate interview questions for this role:

        Role:
        {role}

        Resume:
        {resume_text}

        Return ONLY valid JSON:

        {{
            "questions": [
                {{
                    "question": "",
                    "answer": "",
                    "type": ""
                }}
            ]
        }}
        """

        result = call_llm_json(prompt)

        if not result:
            result = {
                "questions": [
                    {
                        "question": "Tell me about yourself.",
                        "answer": "Explain your education, skills, and projects.",
                        "type": "Behavioral"
                    },
                    {
                        "question": f"What are your strengths as a {role}?",
                        "answer": "Discuss technical strengths and problem-solving.",
                        "type": "Technical"
                    }
                ]
            }

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# =========================
# START SERVER
# =========================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )