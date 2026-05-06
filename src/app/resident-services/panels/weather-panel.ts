import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Ripple } from 'primeng/ripple';

export interface WeatherPanelCopy {
  weatherMeta: string;
  weatherTitle: string;
  weatherBody: string;
  weatherIcon: string;
  weatherCta: string;
}

@Component({
  selector: 'app-resident-weather-panel',
  imports: [ButtonModule, CardModule, Ripple, RouterLink],
  templateUrl: './weather-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentWeatherPanel {
  readonly copy = input.required<WeatherPanelCopy>();
}
