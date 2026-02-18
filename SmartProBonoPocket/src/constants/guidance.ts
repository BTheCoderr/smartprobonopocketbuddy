import { ScenarioType } from '../types';

export const SCENARIO_LABELS: Record<ScenarioType, string> = {
  pulled_over: 'Pulled Over',
  stopped_questioned: 'Stopped & Questioned',
  calling_police: 'Calling Police',
  other: 'Other',
};

export interface GuidanceStep {
  id: string;
  text: string;
  whisperHint?: string;
}

export const GUIDANCE_CHECKLIST = [
  'Hands visible',
  'Speak slowly',
  'Ask before reaching',
  'Only answer what\'s asked',
];

export const COOPERATION_SCRIPT =
  'Officer, I want to cooperate. My license and registration are [in my glove compartment / in my wallet]. May I reach for them?';

const POLICE_INITIATED_GUIDANCE: GuidanceStep[] = [
  { id: '1', text: 'Stay calm. Breathe slowly.', whisperHint: 'Say this to yourself' },
  { id: '2', text: 'Keep your hands visible on the steering wheel or where the officer can see them.', whisperHint: 'Show your hands' },
  { id: '3', text: 'Turn on interior lights if it\'s dark.', whisperHint: 'Visibility helps both of you' },
  { id: '4', text: 'Tell the officer what you\'re doing before you reach. Say: "My license is in my pocket. May I reach for it?"', whisperHint: 'Communicate your movements' },
  { id: '5', text: 'Speak slowly and clearly. Only answer what\'s asked.', whisperHint: 'Brief and factual' },
];

const CITIZEN_INITIATED_GUIDANCE: GuidanceStep[] = [
  { id: '1', text: 'Stay calm. Take a breath before you speak.', whisperHint: 'A calm caller gets better help' },
  { id: '2', text: 'Clearly state your location. The person on the line needs to know where you are.', whisperHint: 'Read your address or describe landmarks' },
  { id: '3', text: 'Describe what\'s happening in short, clear sentences.', whisperHint: 'Factual and direct' },
  { id: '4', text: 'Stay on the line until they tell you it\'s okay to hang up.', whisperHint: 'They may have follow-up questions' },
];

export function getGuidanceForScenario(scenario: ScenarioType): GuidanceStep[] {
  if (scenario === 'calling_police' || scenario === 'other') {
    return CITIZEN_INITIATED_GUIDANCE;
  }
  return POLICE_INITIATED_GUIDANCE;
}

export const SAFETY_CHECKLIST = [
  'Location shared with emergency contact',
  'Alert message sent',
  'Hands visible',
  'Staying calm',
  'Communicating clearly',
];
