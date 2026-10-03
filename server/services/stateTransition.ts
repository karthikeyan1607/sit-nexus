/**
 * State Transition Service (SIT Nexus Specification Section 23 & 49)
 * 
 * Enforces strict enterprise workflow rules for Azure DevOps work items.
 * Currently, the only allowed bulk state transition for sprint closure is:
 * 'Internal Review' -> 'Closed'
 * 
 * Any attempt to transition from New, Active, Resolved, or Blocked directly to Closed
 * is strictly rejected by the transition map.
 */

import { normalize } from './normalize';

export type StoryState = 'New' | 'Active' | 'Internal Review' | 'Resolved' | 'Closed' | 'Blocked';

export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
  targetState?: StoryState;
}

export interface StateTransitionRule {
  from: StoryState;
  to: StoryState;
  actionCode: string;
  description: string;
}

export class StateTransitionService {
  /**
   * The authoritative state transition matrix for SIT Nexus.
   * Only transitions registered here are permitted.
   */
  private static readonly ALLOWED_TRANSITIONS: StateTransitionRule[] = [
    {
      from: 'Internal Review',
      to: 'Closed',
      actionCode: 'CLOSE_INTERNAL_REVIEW_STORIES',
      description: 'Standard end-of-sprint closure for stories that have cleared internal manager review.'
    }
  ];

  /**
   * Validate if a story can transition from currentState to targetState under the given action
   */
  public static canTransition(
    currentState: string,
    targetState: string,
    actionCode: string = 'CLOSE_INTERNAL_REVIEW_STORIES'
  ): TransitionValidationResult {
    // 1. If already closed, it's a no-op / skip
    if (currentState === 'Closed' && targetState === 'Closed') {
      return {
        allowed: false,
        reason: 'Work item is already in Closed state.'
      };
    }

    // 2. Lookup rule in matrix (null-safe)
    const rule = this.ALLOWED_TRANSITIONS.find(
      (r) => normalize(r.from) === normalize(currentState) &&
             normalize(r.to) === normalize(targetState) &&
             r.actionCode === actionCode
    );

    if (!rule) {
      return {
        allowed: false,
        reason: `State transition from "${currentState}" to "${targetState}" is not permitted under action ${actionCode}. Only "Internal Review" -> "Closed" is supported.`
      };
    }

    return {
      allowed: true,
      targetState: rule.to
    };
  }

  /**
   * Filter stories that are eligible for closure
   */
  public static filterEligibleForClosure<T extends { status: string }>(stories: T[]): {
    eligible: T[];
    ineligible: { item: T; reason: string }[];
  } {
    const eligible: T[] = [];
    const ineligible: { item: T; reason: string }[] = [];

    for (const story of stories) {
      const validation = this.canTransition(story.status, 'Closed', 'CLOSE_INTERNAL_REVIEW_STORIES');
      if (validation.allowed) {
        eligible.push(story);
      } else {
        ineligible.push({
          item: story,
          reason: validation.reason || `Current state "${story.status}" is not eligible.`
        });
      }
    }

    return { eligible, ineligible };
  }
}
