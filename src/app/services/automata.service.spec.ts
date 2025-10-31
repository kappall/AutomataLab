import { TestBed } from '@angular/core/testing';

import { AutomataService } from './automata.service';

describe('AutomataService', () => {
  let service: AutomataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutomataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
