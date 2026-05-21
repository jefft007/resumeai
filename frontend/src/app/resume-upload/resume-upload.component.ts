import { Component, OnInit } from '@angular/core';
import { ResumeService, User } from '../resume.service';

@Component({
  selector: 'app-resume-upload',
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent implements OnInit {
  // Tabs: 'dashboard' | 'rewrite' | 'jobs' | 'interview' | 'history'
  activeTab: string = 'dashboard';

  // Selected resume file
  selectedFile: File | null = null;
  isLoading = false;
  analysisResult: any = null;

  // Dark Mode
  isDarkMode = false;

  // Authentication State
  showAuthModal = false;
  authMode: 'login' | 'signup' = 'login';
  authUsername = '';
  authName = '';
  currentUser: User | null = null;

  // History list
  historyList: any[] = [];

  // Resume Rewrite inputs/outputs
  jobDescription: string = '';
  rewriting = false;
  rewriteResult: any = null;

  // Interview prep inputs/outputs
  interviewPrepList: any[] = [];
  loadingInterview = false;
  activeInterviewQuestion: number | null = null;

  // Dynamic user skills (initialized from analysis, customizable)
  userSkills: string[] = [];
  newSkillInput = '';
  recommendedJobs: any[] = [];

  constructor(private resumeService: ResumeService) {}

  ngOnInit(): void {
    // Check local storage for dark mode
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.applyTheme();

    // Subscribe to current user
    this.resumeService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadHistory();
      } else {
        this.historyList = [];
      }
    });

    // Subscribe to analysis result
    this.resumeService.analysisResult$.subscribe(result => {
      this.analysisResult = result;
      if (result) {
        this.userSkills = [...result.detected_skills];
        this.updateJobRecommendations();
        this.rewriteResult = null;
        this.interviewPrepList = [];
      } else {
        this.userSkills = [];
        this.recommendedJobs = [];
      }
    });
  }

  // File selection
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
    } else {
      alert('Please upload a valid PDF file');
    }
  }

  // Upload and analyze
  uploadResume(): void {
    if (!this.selectedFile) {
      alert('Please select a resume PDF');
      return;
    }

    this.isLoading = true;
    this.resumeService.analyzeResume(this.selectedFile).subscribe({
      next: () => {
        this.isLoading = false;
        this.loadHistory();
      },
      error: (err) => {
        console.error(err);
        alert('Error analyzing resume. Please make sure the backend is running.');
        this.isLoading = false;
      }
    });
  }

  // Dark Mode toggle
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  applyTheme(): void {
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // --- Auth Controls ---
  openAuth(mode: 'login' | 'signup'): void {
    this.authMode = mode;
    this.authUsername = '';
    this.authName = '';
    this.showAuthModal = true;
  }

  closeAuth(): void {
    this.showAuthModal = false;
  }

  handleAuthSubmit(): void {
    if (!this.authUsername) {
      alert('Please enter a username');
      return;
    }

    if (this.authMode === 'login') {
      this.resumeService.login(this.authUsername).subscribe({
        next: () => {
          this.closeAuth();
        },
        error: (err) => {
          alert(err.message || 'Login failed');
        }
      });
    } else {
      if (!this.authName) {
        alert('Please enter your name');
        return;
      }
      this.resumeService.signup(this.authUsername, this.authName).subscribe({
        next: () => {
          this.closeAuth();
        }
      });
    }
  }

  logout(): void {
    this.resumeService.logout();
    this.selectedFile = null;
    this.activeTab = 'dashboard';
  }

  // --- History Controls ---
  loadHistory(): void {
    this.historyList = this.resumeService.getHistory();
  }

  selectHistoryItem(item: any): void {
    this.resumeService.setAnalysisResult(item.analysis);
    this.activeTab = 'dashboard';
  }

  deleteHistoryItem(event: Event, id: string): void {
    event.stopPropagation();
    this.resumeService.deleteHistoryItem(id);
    this.loadHistory();
  }

  // --- Skills management ---
  addSkill(): void {
    const val = this.newSkillInput.trim();
    if (val && !this.userSkills.some(s => s.toLowerCase() === val.toLowerCase())) {
      this.userSkills.push(val);
      this.newSkillInput = '';
      this.updateJobRecommendations();
    }
  }

  removeSkill(skill: string): void {
    this.userSkills = this.userSkills.filter(s => s !== skill);
    this.updateJobRecommendations();
  }

  updateJobRecommendations(): void {
    this.recommendedJobs = this.resumeService.getRecommendedJobs(this.userSkills);
  }

  // --- AI Actions ---
  getInterviewQuestions(): void {
    if (!this.analysisResult) return;

    this.loadingInterview = true;
    this.interviewPrepList = [];
    this.activeInterviewQuestion = null;

    this.resumeService.interviewPrep(
      this.analysisResult.extracted_text,
      this.analysisResult.best_suited_role
    ).subscribe({
      next: (res) => {
        this.interviewPrepList = res.questions || [];
        this.loadingInterview = false;
      },
      error: (err) => {
        console.error(err);
        alert('Failed to generate interview questions');
        this.loadingInterview = false;
      }
    });
  }

  toggleInterviewQuestion(index: number): void {
    this.activeInterviewQuestion = this.activeInterviewQuestion === index ? null : index;
  }

  getRewrite(): void {
    if (!this.analysisResult || !this.jobDescription.trim()) {
      alert('Please fill out the target job description first.');
      return;
    }

    this.rewriting = true;
    this.rewriteResult = null;

    this.resumeService.rewriteResume(
      this.analysisResult.extracted_text,
      this.jobDescription
    ).subscribe({
      next: (res) => {
        this.rewriteResult = res;
        this.rewriting = false;
      },
      error: (err) => {
        console.error(err);
        alert('Failed to rewrite resume');
        this.rewriting = false;
      }
    });
  }

  // --- Print/PDF Downloader ---
  downloadPDF(): void {
    window.print();
  }
}