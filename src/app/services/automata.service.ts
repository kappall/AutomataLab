import { Injectable } from '@angular/core';
import { State } from '../models/state.model';
import { Transition } from '../models/transition.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AutomataService {
  private stateCounter: number = 0;
  private transitionCounter: number = 0;

  private states: State[] = [];
  private transitions: Transition[] = [];

  private statesSubject = new BehaviorSubject<State[]>([]);
  public states$ = this.statesSubject.asObservable();

  private transitionsSubject = new BehaviorSubject<Transition[]>([]);
  public transitions$ = this.transitionsSubject.asObservable();

  constructor() {}

  addState(x: number, y: number, customName?: string): void {
    const newState: State = {
      id: this.stateCounter.toString(),
      name: customName || `q${this.stateCounter}`,
      x: x,
      y: y,
      isInitial: false,
      isFinal: false
    };
    this.states.push(newState);
    this.stateCounter++;

    this.statesSubject.next([...this.states]);
  }

  removeState(stateId: string): void {
    this.states = this.states.filter(state => state.id !== stateId);
    this.transitions = this.transitions.filter(transition => transition.from !== stateId && transition.to !== stateId);
    this.statesSubject.next([...this.states]);
    this.transitionsSubject.next([...this.transitions]);
  }

  addTransition(transition: Transition): void {
    this.transitions.push(transition);
    this.transitionsSubject.next([...this.transitions]);
    this.transitionCounter++;
  }

  removeTransition(transitionId: string): void {
    this.transitions = this.transitions.filter(transition => transition.id !== transitionId);
    this.transitionsSubject.next([...this.transitions]);
  }

  getStates(): State[] {
    return this.states;
  }

  getTransitions(): Transition[] {
    return this.transitions;
  }

  clearAutomata(): void {
    this.states = [];
    this.transitions = [];
    this.transitionsSubject.next([]);
    this.statesSubject.next([]);

    this.transitionCounter = 0;
    this.stateCounter = 0;
  }
}