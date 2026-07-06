import { Pipe, PipeTransform } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { resolveWidgetText } from '../mappers/dashboard-widget-text';



@Pipe({

    name: 'dashboardWidgetText',

    standalone: true,

    pure: false,

})

export class DashboardWidgetTextPipe implements PipeTransform {

    constructor(private readonly translate: TranslateService) {}



    transform(text: string | undefined, legacyKey?: string): string {

        return resolveWidgetText(text, legacyKey, this.translate);

    }

}


