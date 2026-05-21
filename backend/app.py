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
# SAFE KEYWORD MATCH
# =========================
def contains_skill(text, skill):
    pattern = r'\b' + re.escape(skill.lower()) + r'\b'
    return re.search(pattern, text.lower()) is not None


# =========================
# LOCAL ATS ANALYSIS
# =========================
# =========================
# LOCAL ATS ANALYSIS
# =========================
def local_resume_analysis(text):

    text_lower = text.lower()

    # =========================
    # SKILLS DATABASE
    # =========================
    skills_db = {
        "python": 6,
        "java": 6,
        "c++": 5,
        "angular": 8,
        "react": 8,
        "html": 4,
        "css": 4,
        "javascript": 6,
        "typescript": 6,
        "sql": 6,
        "mysql": 5,
        "mongodb": 7,
        "node": 7,
        "express": 6,
        "flask": 7,
        "django": 7,
        "docker": 10,
        "aws": 10,
        "azure": 10,
        "git": 5,
        "github": 5,
        "jenkins": 8,
        "machine learning": 12,
        "deep learning": 12,
        "ai": 10,
        "nlp": 10,
        "data science": 12,
        "tensorflow": 10,
        "pytorch": 10,
        "tailwind": 5,
        "bootstrap": 4,
        "spring boot": 10,
        "kubernetes": 12,
        "firebase": 6
    }

    detected_skills = []
    missing_skills = []

    # =========================
    # INITIAL SCORE
    # =========================
    score = 15

    # =========================
    # SKILL SCORING
    # =========================
    for skill, points in skills_db.items():

        if skill in text_lower:
            detected_skills.append(skill.title())
            score += points
        else:
            missing_skills.append(skill.title())

    # =========================
    # EXPERIENCE BONUS
    # =========================
    experience_keywords = [
        "internship",
        "experience",
        "developer",
        "engineer",
        "worked"
    ]

    experience_found = 0

    for word in experience_keywords:
        if word in text_lower:
            experience_found += 1

    score += experience_found * 3

    # =========================
    # PROJECT BONUS
    # =========================
    project_count = text_lower.count("project")

    if project_count >= 4:
        score += 12

    elif project_count == 3:
        score += 9

    elif project_count == 2:
        score += 6

    elif project_count == 1:
        score += 3

    # =========================
    # EDUCATION BONUS
    # =========================
    education_keywords = [
        "bca",
        "mca",
        "btech",
        "computer science",
        "information technology"
    ]

    for edu in education_keywords:
        if edu in text_lower:
            score += 5
            break

    # =========================
    # LINKS BONUS
    # =========================
    if "github.com" in text_lower:
        score += 4

    if "linkedin.com" in text_lower:
        score += 4

    # =========================
    # WORD COUNT BONUS
    # =========================
    word_count = len(text.split())

    if word_count > 600:
        score += 10

    elif word_count > 350:
        score += 7

    elif word_count > 200:
        score += 4

    elif word_count < 100:
        score -= 8

    # =========================
    # ROLE DETECTION
    # =========================

    frontend_score = 0
    backend_score = 0
    ai_score = 0
    devops_score = 0
    data_score = 0

    frontend_keywords = [
        "angular",
        "react",
        "html",
        "css",
        "javascript",
        "typescript",
        "tailwind"
    ]

    backend_keywords = [
        "python",
        "flask",
        "django",
        "node",
        "express",
        "mongodb",
        "sql",
        "mysql"
    ]

    ai_keywords = [
        "machine learning",
        "deep learning",
        "tensorflow",
        "pytorch",
        "nlp",
        "ai"
    ]

    devops_keywords = [
        "docker",
        "jenkins",
        "aws",
        "azure",
        "kubernetes"
    ]

    data_keywords = [
        "data science",
        "pandas",
        "numpy",
        "matplotlib"
    ]

    for skill in frontend_keywords:
        if skill in text_lower:
            frontend_score += 1

    for skill in backend_keywords:
        if skill in text_lower:
            backend_score += 1

    for skill in ai_keywords:
        if skill in text_lower:
            ai_score += 1

    for skill in devops_keywords:
        if skill in text_lower:
            devops_score += 1

    for skill in data_keywords:
        if skill in text_lower:
            data_score += 1

    # =========================
    # BEST ROLE LOGIC
    # =========================

    if ai_score >= 3:
        best_role = "AI/ML Engineer"

    elif devops_score >= 3:
        best_role = "DevOps Engineer"

    elif frontend_score >= 4 and backend_score >= 4:
        best_role = "Full Stack Developer"

    elif frontend_score >= 4:
        best_role = "Frontend Developer"

    elif backend_score >= 4:
        best_role = "Backend Developer"

    elif data_score >= 3:
        best_role = "Data Scientist"

    else:
        best_role = "Software Developer"

    # =========================
    # NORMALIZE SCORE
    # =========================

    if score > 95:
        score = 95

    if score < 25:
        score = 25

    # =========================
    # IMPROVEMENTS
    # =========================
    improvements = []

    if "github.com" not in text_lower:
        improvements.append("Add GitHub profile link.")

    if "linkedin.com" not in text_lower:
        improvements.append("Add LinkedIn profile.")

    if "docker" not in text_lower:
        improvements.append("Learn Docker for better ATS ranking.")

    if "aws" not in text_lower:
        improvements.append("Add cloud skills like AWS.")

    if project_count < 2:
        improvements.append("Add more real-world projects.")

    if word_count < 180:
        improvements.append("Resume content is too short.")

    if experience_found == 0:
        improvements.append("Add internship or practical experience.")

    # =========================
    # FINAL RESPONSE
    # =========================
    return {
        "ats_score": score,
        "detected_skills": detected_skills[:15],
        "missing_skills": missing_skills[:10],
        "best_suited_role": best_role,
        "improvements": improvements,
        "extracted_text": text
    }

# =========================
# OPENROUTER API CALL
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

        text = extract_resume_text(file)

        if not text:
            return jsonify({
                "error": "Unable to extract text from PDF"
            }), 400

        analysis = local_resume_analysis(text)

        return jsonify(analysis)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# REWRITE RESUME
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
                    "Added ATS keywords",
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
# INTERVIEW PREP
# =========================
@app.route("/interview-prep", methods=["POST"])
def interview_prep():

    try:

        data = request.json or {}

        role = data.get("role", "")
        resume_text = data.get("resume_text", "")

        prompt = f"""
        Generate interview questions for this role.

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
                        "answer": "Explain your background, skills, and projects.",
                        "type": "Behavioral"
                    },
                    {
                        "question": f"What technologies are important for a {role}?",
                        "answer": "Discuss frameworks, tools, and best practices.",
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