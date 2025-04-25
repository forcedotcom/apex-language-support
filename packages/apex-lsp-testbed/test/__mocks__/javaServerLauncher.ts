import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface Executable {
  command: string;
  args?: string[];
  options?: cp.SpawnOptions;
}

export interface JavaLSOptions {
  javaHome?: string;
  jarPath?: string;
  javaMemory?: number;
  enableSemanticErrors?: boolean;
  enableCompletionStatistics?: boolean;
  debugPort?: number;
  logLevel?: string;
  suspendStartup?: boolean;
  env?: NodeJS.ProcessEnv;
  workspacePath?: string;
}

export const isDebugMode = (): boolean => {
  return false;
};

export const getJavaHome = async (): Promise<string> => {
  return '/mock/java/home';
};

export const checkJavaVersion = async (javaHome: string): Promise<void> => {
  // Mock implementation
};

export const findJarFile = async (): Promise<string> => {
  return '/mock/path/to/apex-jorje-lsp.jar';
};

export const launchJavaServer = async (
  options: JavaLSOptions = {},
): Promise<Executable> => {
  return {
    command: 'java',
    args: ['-jar', '/mock/path/to/apex-jorje-lsp.jar'],
    options: {
      env: options.env || process.env,
      cwd: options.workspacePath || process.cwd(),
    },
  };
};
