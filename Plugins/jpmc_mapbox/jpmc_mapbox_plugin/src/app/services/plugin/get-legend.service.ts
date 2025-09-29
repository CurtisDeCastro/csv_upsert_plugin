import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError, of, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { WorkbookElementData } from '@sigmacomputing/plugin';

@Injectable({ providedIn: 'root' })
export class GetLegendService {

    constructor(private http: HttpClient) { }

    getLegend(
        elementData: WorkbookElementData): Observable<any> {
  
          const legend = Object.values(elementData)
            .flat()
            .map(item => typeof item === 'string' ? item : item);
  
          return of(legend);
  
      }

}