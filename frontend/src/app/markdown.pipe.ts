import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown'
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';

    let html = value;

    // Headings (make sure we handle \r\n or \n boundary)
    html = html.replace(/^### (.*?)(?:\r?\n|$)/gim, '<h4 class="text-lg font-bold text-gray-800 dark:text-gray-100 mt-4 mb-2">$1</h4>');
    html = html.replace(/^## (.*?)(?:\r?\n|$)/gim, '<h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mt-6 mb-3">$1</h3>');
    html = html.replace(/^# (.*?)(?:\r?\n|$)/gim, '<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4">$1</h2>');

    // Bold text (**bold**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');

    // Bullet lists (* item or - item)
    // We can match contiguous lines starting with * or - and wrap them if we want, but simple line replacements are very safe:
    html = html.replace(/^\* (.*?)(?:\r?\n|$)/gim, '<li class="ml-6 list-disc text-gray-700 dark:text-gray-300 my-1">$1</li>');
    html = html.replace(/^- (.*?)(?:\r?\n|$)/gim, '<li class="ml-6 list-disc text-gray-700 dark:text-gray-300 my-1">$1</li>');

    // Handle standard line breaks for paragraphs, ensuring we don't break tags
    html = html.replace(/\r?\n/g, '<br>');

    // Clean up duplicate <br> inside list styling or headings
    html = html.replace(/(<\/li>)<br>/g, '$1');
    html = html.replace(/(<\/h\d>)<br>/g, '$1');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
