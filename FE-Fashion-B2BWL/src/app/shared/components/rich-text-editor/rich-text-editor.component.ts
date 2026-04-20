import {
  Component,
  ElementRef,
  ViewChild,
  forwardRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { TuiButton } from '@taiga-ui/core';

/**
 * Lightweight rich text for admin descriptions (bold, lists, links).
 * Stores HTML string; use [innerHTML] with Angular sanitizer where displayed.
 */
@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiButton],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('editor') editorRef?: ElementRef<HTMLDivElement>;

  disabled = false;
  private inner = '';

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    el.innerHTML = this.inner;
    el.contentEditable = this.disabled ? 'false' : 'true';
  }

  writeValue(v: string | null): void {
    this.inner = v ?? '';
    const el = this.editorRef?.nativeElement;
    if (el) {
      el.innerHTML = this.inner;
    }
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
    const el = this.editorRef?.nativeElement;
    if (el) {
      el.contentEditable = isDisabled ? 'false' : 'true';
    }
    this.cdr.markForCheck();
  }

  @HostListener('input')
  emitHtml(): void {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    this.inner = el.innerHTML;
    this.onChange(this.inner);
  }

  exec(cmd: string, value?: string): void {
    if (this.disabled) return;
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, value);
    this.emitHtml();
    this.cdr.markForCheck();
  }

  promptLink(): void {
    const url = window.prompt('URL (https://…)', 'https://');
    if (url) this.exec('createLink', url);
  }

  clearFormat(): void {
    this.exec('removeFormat');
    this.exec('unlink');
  }

  onBlur(): void {
    this.onTouched();
  }
}
