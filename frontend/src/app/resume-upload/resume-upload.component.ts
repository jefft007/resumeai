import { Component } from '@angular/core';

@Component({
  selector: 'app-resume-upload',
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent {

  // ===== UI STATE =====
  isDarkMode: boolean = false;
  isLoading: boolean = false;
  activeTab: string = 'dashboard';

  // ===== AUTH =====
  showAuthModal: boolean = false;
  authMode: 'login' | 'signup' = 'login';
  authUsername: string = '';
  authName: string = '';
  currentUser: any = null;

  // ===== FILE =====
  selectedFile: File | null = null;

  // ===== ANALYSIS =====
  analysisResult: any = null;
  historyList: any[] = [];

  // ===== SKILLS =====
  userSkills: string[] = [];
  newSkillInput: string = '';

  // ===== REWRITE =====
  jobDescription: string = '';
  rewriting: boolean = false;
  rewriteResult: any = null;

  // ===== JOBS =====
  recommendedJobs: any[] = [
    {
      logo: "💻",
      title: "Frontend Developer",
      company: "Tech Corp",
      location: "Remote",
      salary: "5–12 LPA",
      description: "Work with Angular and modern web technologies.",
      matchScore: 78,
      matchedSkills: ["Angular"],
      missingSkills: ["Node.js", "Docker"]
    }
  ];

  // ===== INTERVIEW =====
  interviewPrepList: any[] = [];
  loadingInterview: boolean = false;
  activeInterviewQuestion: number | null = null;

  // ================= FILE =================
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadResume() {
    if (!this.selectedFile) return;

    this.isLoading = true;

    setTimeout(() => {
      this.analysisResult = {
        ats_score: 72,
        best_suited_role: "Software Developer",
        extracted_text: "Sample extracted resume text...",
        improvements: ["Add more keywords", "Improve formatting"],
        missing_skills: ["Docker", "AWS", "System Design"]
      };

      this.userSkills = ["Angular", "JavaScript"];

      this.isLoading = false;
    }, 2000);
  }

  // ================= HISTORY =================
  selectHistoryItem(item: any) {
    this.analysisResult = item.analysis;
  }

  deleteHistoryItem(event: Event, id: number) {
    event.stopPropagation();
    this.historyList = this.historyList.filter(x => x.id !== id);
  }

  // ================= SKILLS =================
  addSkill() {
    if (this.newSkillInput.trim()) {
      this.userSkills.push(this.newSkillInput.trim());
      this.newSkillInput = '';
    }
  }

  removeSkill(skill: string) {
    this.userSkills = this.userSkills.filter(s => s !== skill);
  }

  // ================= REWRITE =================
  getRewrite() {
    this.rewriting = true;

    setTimeout(() => {
      this.rewriteResult = {
        rewritten_resume: "**Optimized Resume Content (AI)**",
        changes_made: [
          "Added ATS keywords",
          "Improved formatting",
          "Strengthened achievements"
        ]
      };
      this.rewriting = false;
    }, 1500);
  }

  // ================= JOBS =================
  // already defined above

  // ================= INTERVIEW =================
  getInterviewQuestions() {
    this.loadingInterview = true;

    setTimeout(() => {
      this.interviewPrepList = [
        {
          type: "Technical",
          question: "What is Angular change detection?",
          answer: "Explain default vs OnPush strategy..."
        },
        {
          type: "HR",
          question: "Tell me about yourself",
          answer: "Structure answer using STAR method..."
        }
      ];
      this.loadingInterview = false;
    }, 1500);
  }

  toggleInterviewQuestion(i: number) {
    this.activeInterviewQuestion =
      this.activeInterviewQuestion === i ? null : i;
  }

  // ================= AUTH =================
  openAuth(mode: 'login' | 'signup') {
    this.authMode = mode;
    this.showAuthModal = true;
  }

  closeAuth() {
    this.showAuthModal = false;
  }

  handleAuthSubmit() {
    this.currentUser = {
      name: this.authName || "User",
      username: this.authUsername
    };
    this.closeAuth();
  }

  logout() {
    this.currentUser = null;
  }

  // ================= UI =================
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle('dark', this.isDarkMode);
  }

  downloadPDF() {
    window.print();
  }

}