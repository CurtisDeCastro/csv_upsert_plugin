import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError, of, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { WorkbookElementData } from '@sigmacomputing/plugin';

@Injectable({ providedIn: 'root' })
export class GetGeoJsonsService {

    constructor(private http: HttpClient) { }

    getGeoJsons(
      elementData: WorkbookElementData): Observable<any> {

        const geoJsons = Object.values(elementData)
          .flat()
          .map(item => typeof item === 'string' ? JSON.parse(item) : item);

        return of(geoJsons);

    }

}