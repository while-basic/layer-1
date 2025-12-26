
export interface Project {
  name: string;
  description: string;
  status: string;
  tech: string[];
}

export interface KnowledgeBase {
  bio: {
    current_role: string;
    experience: string;
    identity: string;
    location: string;
  };
  active_projects: Project[];
  philosophy: {
    approach: string;
    methodology: string;
    perspective: string;
  };
  upcoming: {
    celaya_solutions: string;
    focus: string;
  };
}

export interface CardData {
  type: 'project' | 'media' | 'bio';
  content: any;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  cards?: CardData[];
  id: string;
}
