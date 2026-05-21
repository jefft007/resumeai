import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  username: string;
  name: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  salary: string;
  skills: string[];
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  private baseUrl = 'http://127.0.0.1:5000';

  // State variables
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private analysisResultSubject = new BehaviorSubject<any | null>(null);
  public analysisResult$ = this.analysisResultSubject.asObservable();

  // Available mock jobs
  private mockJobs: Job[] = [
    {
      id: 'job1',
      title: 'Frontend Developer',
      company: 'TechVibe Corp',
      logo: '💻',
      location: 'San Francisco, CA (Remote)',
      salary: '$110,000 - $140,000',
      skills: ['Angular', 'TypeScript', 'Tailwind CSS', 'CSS', 'JavaScript', 'Git'],
      description: 'We are looking for a Frontend Engineer to build high-performance Single Page Applications (SPAs) using Angular and custom styling.'
    },
    {
      id: 'job2',
      title: 'Backend Software Engineer',
      company: 'DataFlow Inc',
      logo: '⚙️',
      location: 'New York, NY (Hybrid)',
      salary: '$120,000 - $155,000',
      skills: ['Python', 'Flask', 'SQL', 'Docker', 'REST APIs', 'Git', 'CI/CD Pipelines'],
      description: 'Join our team to develop scalable backend services using Python, Flask, and cloud-native database pipelines.'
    },
    {
      id: 'job3',
      title: 'Full Stack Engineer',
      company: 'SaaSify',
      logo: '🚀',
      location: 'Austin, TX (Remote)',
      salary: '$130,000 - $160,000',
      skills: ['Angular', 'TypeScript', 'Python', 'Flask', 'SQL', 'Tailwind CSS', 'Git', 'Unit Testing'],
      description: 'Looking for a generalist engineer with deep expertise in Angular frontend frameworks and Flask python endpoints.'
    },
    {
      id: 'job4',
      title: 'DevOps & Infrastructure Engineer',
      company: 'CloudPulse',
      logo: '☁️',
      location: 'Seattle, WA',
      salary: '$140,000 - $180,000',
      skills: ['Docker', 'CI/CD Pipelines', 'Kubernetes', 'Linux', 'AWS', 'Python', 'Shell Scripting'],
      description: 'Automate build runs and scale cluster architectures. Require solid python skills and deep DevOps toolchain knowledge.'
    },
    {
      id: 'job5',
      title: 'Data Scientist & ML Developer',
      company: 'NeuroAI',
      logo: '🧠',
      location: 'Boston, MA (Remote)',
      salary: '$135,000 - $170,000',
      skills: ['Python', 'Machine Learning', 'Data Science', 'SQL', 'Pandas', 'TensorFlow'],
      description: 'Train models and build predictive text evaluation pipelines. Python knowledge and statistical modeling required.'
    }
  ];

  constructor(private http: HttpClient) {
    // Load user from localStorage on init
    const storedUser = localStorage.getItem('resume_user');
    if (storedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('resume_user');
      }
    }
  }

  // Set the analysis result manually (e.g. from history click)
  setAnalysisResult(result: any): void {
    this.analysisResultSubject.next(result);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // --- Auth Logic ---
  login(username: string): Observable<User> {
    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    const foundUser = users.find((u: any) => u.username.trim().toLowerCase() === username.trim().toLowerCase());

    if (!foundUser) {
      return throwError(() => new Error('User not found. Please sign up first.'));
    }

    localStorage.setItem('resume_user', JSON.stringify(foundUser));
    this.currentUserSubject.next(foundUser);
    return of(foundUser);
  }

  signup(username: string, name: string): Observable<User> {
    // Basic local registration logic - save user profile
    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    if (!users.find((u: any) => u.username === username)) {
      users.push({ username, name });
      localStorage.setItem('registered_users', JSON.stringify(users));
    }
    return this.login(username);
  }

  logout(): void {
    localStorage.removeItem('resume_user');
    this.currentUserSubject.next(null);
    this.analysisResultSubject.next(null);
  }

  // --- History Logic ---
  saveToHistory(filename: string, analysis: any): void {
    const user = this.currentUserSubject.value;
    if (!user) return;

    const historyKey = `history_${user.username}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');

    // Prevent saving exact duplicates consecutively
    if (history.length > 0 && history[0].analysis.extracted_text === analysis.extracted_text) {
      return;
    }

    // Add new entry to start of array
    history.unshift({
      id: new Date().getTime().toString(),
      filename,
      date: new Date().toLocaleDateString(),
      analysis
    });

    // Limit history to 10 items
    if (history.length > 10) history.pop();

    localStorage.setItem(historyKey, JSON.stringify(history));
  }

  getHistory(): any[] {
    const user = this.currentUserSubject.value;
    if (!user) return [];

    const historyKey = `history_${user.username}`;
    return JSON.parse(localStorage.getItem(historyKey) || '[]');
  }

  deleteHistoryItem(id: string): void {
    const user = this.currentUserSubject.value;
    if (!user) return;

    const historyKey = `history_${user.username}`;
    let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    history = history.filter((item: any) => item.id !== id);
    localStorage.setItem(historyKey, JSON.stringify(history));
  }

  // --- API Calls ---
  analyzeResume(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('resume', file);

    return this.http.post<any>(`${this.baseUrl}/analyze`, formData).pipe(
      tap(result => {
        this.analysisResultSubject.next(result);
        if (this.currentUserSubject.value) {
          this.saveToHistory(file.name, result);
        }
      })
    );
  }

  rewriteResume(resumeText: string, jobDescription: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/rewrite`, {
      resume_text: resumeText,
      job_description: jobDescription
    });
  }

  interviewPrep(resumeText: string, role: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/interview-prep`, {
      resume_text: resumeText,
      role: role
    });
  }

  // --- Job Match Recommendation Engine ---
  getRecommendedJobs(userSkills: string[]): any[] {
    if (!userSkills || userSkills.length === 0) return [];

    const lowerUserSkills = userSkills.map(s => s.trim().toLowerCase());

    return this.mockJobs.map(job => {
      const matched: string[] = [];
      const missing: string[] = [];

      job.skills.forEach(skill => {
        const lowerSkill = skill.toLowerCase();
        // Check if any of user's skills matched this job skill
        const isMatched = lowerUserSkills.some(us => us.includes(lowerSkill) || lowerSkill.includes(us));
        if (isMatched) {
          matched.push(skill);
        } else {
          missing.push(skill);
        }
      });

      // Calculate matching percentage
      const matchScore = Math.round((matched.length / job.skills.length) * 100);

      return {
        ...job,
        matchScore,
        matchedSkills: matched,
        missingSkills: missing
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }
}
