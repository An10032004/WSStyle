import {
  Component,
  Input,
  forwardRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { TuiButton, TuiTextfield, TuiIcon } from '@taiga-ui/core';
import { TuiTextfieldControllerModule } from '@taiga-ui/legacy';
import { CloudinaryUploadService } from '../../../services/cloudinary-upload.service';

export type ImageUrlFieldMode = 'url' | 'upload';

@Component({
  selector: 'app-image-url-field',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton, TuiTextfield, TuiIcon, TuiTextfieldControllerModule],
  templateUrl: './image-url-field.component.html',
  styleUrl: './image-url-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUrlFieldComponent),
      multi: true,
    },
  ],
})
export class ImageUrlFieldComponent implements ControlValueAccessor {
  private readonly cloudinary = inject(CloudinaryUploadService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Optional Cloudinary folder override (otherwise server default). */
  @Input() uploadFolder = '';

  @Input() placeholder = 'https://...';
  @Input() compact = false;

  mode: ImageUrlFieldMode = 'url';
  value = '';
  disabled = false;

  uploading = false;
  uploadProgress = 0;
  uploadError: string | null = null;

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null): void {
    this.value = v ?? '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  setMode(m: ImageUrlFieldMode): void {
    this.mode = m;
    this.uploadError = null;
    this.cdr.markForCheck();
  }

  onUrlInput(s: string): void {
    this.value = s;
    this.onChange(this.value);
    this.cdr.markForCheck();
  }

  clear(): void {
    this.value = '';
    this.onChange('');
    this.uploadError = null;
    this.cdr.markForCheck();
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploadError = null;
    this.uploading = true;
    this.uploadProgress = 0;
    this.cdr.markForCheck();
    this.cloudinary.uploadImage(file, {
      folder: this.uploadFolder || undefined,
      onProgress: (p) => {
        this.uploadProgress = p;
        this.cdr.markForCheck();
      },
    }).subscribe({
      next: (url) => {
        this.value = url;
        this.onChange(url);
        this.mode = 'url';
        this.uploading = false;
        this.uploadProgress = 0;
        this.cdr.markForCheck();
      },
      error: (e: Error) => {
        this.uploading = false;
        this.uploadProgress = 0;
        this.uploadError = e?.message || 'Upload failed';
        this.cdr.markForCheck();
      },
    });
  }

  previewBroken(): void {
    // optional: could set a flag; keep empty for now
  }
}
