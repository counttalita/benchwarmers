
// Missing module declarations
declare module 'node-mocks-http' {
  export function createMocks(options?: any): any;
}

declare module 'qrcode' {
  export function toDataURL(text: string, options?: any): Promise<string>;
}

declare module 'appwrite' {
  export class Client {
    setEndpoint(endpoint: string): Client;
    setProject(project: string): Client;
  }
  export class Account {
    constructor(client: Client);
  }
  export class Databases {
    constructor(client: Client);
  }
}

// Global test utilities
declare global {
  var userEvent: {
    click: (element: Element) => Promise<void>;
    type: (element: Element, text: string) => Promise<void>;
    clear: (element: Element) => Promise<void>;
  };
  
  var getByRole: (role: string, options?: any) => Element;
}
