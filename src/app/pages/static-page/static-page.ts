import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-static-page',
  templateUrl: './static-page.html',
  styleUrl: './static-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaticPage {
  private readonly route = inject(ActivatedRoute);

  readonly title: string = (this.route.snapshot.data['title'] as string | undefined) ?? '';
  readonly text: string = (this.route.snapshot.data['text'] as string | undefined) ?? '';
}
