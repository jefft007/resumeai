import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-resume-upload',
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent {

  constructor(private http: HttpClient) {}

  // ================= API URL =================
  apiUrl = 'https://resumeai-2ai9.onrender.com';

  // ================= UI =================
  isLoading: boolean = false;

  // ================= FILE =================
  selectedFile: File | null = null;

  // ================= RESULT =================
  analysisResult: any = null;

  // ================= FILE SELECT =================
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  // ================= UPLOAD =================
  uploadResume() {

    if (!this.selectedFile) {
      alert('Please select a PDF resume');
      return;
    }

    const formData = new FormData();

    formData.append('resume', this.selectedFile);

    this.isLoading = true;

    this.http.post(
      `${this.apiUrl}/analyze`,
      formData
    ).subscribe({

      next: (res: any) => {

        console.log(res);

        this.analysisResult = res;

        this.isLoading = false;
      },

      error: (err) => {

        console.log(err);

        alert('Backend error');

        this.isLoading = false;
      }

    });

  }

}