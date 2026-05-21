import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

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

  // ✅ YOUR RENDER BACKEND
  private baseUrl = 'https://resumeai-2ai9.onrender.com';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private analysisResultSubject = new BehaviorSubject<any | null>(null);
  public analysisResult$ = this.analysisResultSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  // =====================
  // STORAGE
  // =====================
  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem('resume_user');
      if (storedUser) {
        this.currentUserSubject.next(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem('resume_user');
    }
  }

  // =====================
  // ANALYZE RESUME
  // =====================
  analyzeResume(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('resume', file);

    return this.http.post<any>(`${this.baseUrl}/analyze`, formData);
  }

  // =====================
  // REWRITE RESUME
  // =====================
  rewriteResume(resumeText: string, jobDescription: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/rewrite`, {
      resume_text: resumeText,
      job_description: jobDescription
    });
  }

  // =====================
  // INTERVIEW PREP
  // =====================
  interviewPrep(resumeText: string, role: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/interview-prep`, {
      resume_text: resumeText,
      role
    });
  }
}