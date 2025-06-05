/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CharStreams, CommonTokenStream } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';

import {
  ApexFoldingRangeListener,
  FoldingRangeKind,
} from '../../src/parser/listeners/ApexFoldingRangeListener';

describe('ApexFoldingRangeListener', () => {
  let listener: ApexFoldingRangeListener;

  beforeEach(() => {
    listener = new ApexFoldingRangeListener();
  });

  const parseAndWalk = (code: string): void => {
    const inputStream = CharStreams.fromString(code);
    const lexer = new ApexLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new ApexParser(tokenStream);
    const walker = new ParseTreeWalker();
    walker.walk(listener, parser.compilationUnit());
  };

  const findRangeByKind = (kind: FoldingRangeKind) =>
    listener.getResult().find((range) => range.kind === kind);

  describe('Class folding', () => {
    it('should create folding range for class declaration', () => {
      const code = `
public class TestClass {
    public void method1() {
        // method body
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Class);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(2);
      expect(range?.endLine).toBe(6);
    });
  });

  describe('Method folding', () => {
    it('should create folding range for method declaration', () => {
      const code = `
public class TestClass {
    public void method1() {
        // method body
        System.debug('test');
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Method);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(3);
      expect(range?.endLine).toBe(6);
    });

    it('should create folding range for method with return on same line', () => {
      const code = `
public class TestClass {
    public String aString() { return 'Hello, World!';
       
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Method);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(3);
      expect(range?.endLine).toBe(5);
    });

    it('should create folding range for method with return on new line', () => {
      const code = `
public class TestClass {
    public String aString() { 
        return 'Hello, World!';    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Method);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(3);
      expect(range?.endLine).toBe(4);
    });

    it('should create folding ranges for adjacent methods', () => {
      const code = `
public class TestClass {
    public String aString() { 
        return 'Hello, World!';    } public Integer aNumber() {
        return 42;
    }
}`;
      parseAndWalk(code);
      const ranges = listener
        .getResult()
        .filter((r) => r.kind === FoldingRangeKind.Method);
      expect(ranges).toHaveLength(2);

      const stringMethod = ranges[0];
      expect(stringMethod.startLine).toBe(3);
      expect(stringMethod.endLine).toBe(4);

      const numberMethod = ranges[1];
      expect(numberMethod.startLine).toBe(4);
      expect(numberMethod.endLine).toBe(6);
    });
  });

  describe('Block folding', () => {
    it('should create folding range for code blocks', () => {
      const code = `
public class TestClass {
    {
        // instance block
        System.debug('test');
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Block);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(3);
      expect(range?.endLine).toBe(6);
    });

    it('should create folding range for block with statement inside', () => {
      const code = `
public class TestClass {
    {
        System.debug('inside block');
        Integer i = 1;
        System.debug(i);
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Block);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(3);
      expect(range?.endLine).toBe(7);
    });

    it('should create folding range for block with statement after', () => {
      const code = `
public class TestClass {
    {
        System.debug('inside block');
    }
    public void method1() {
        System.debug('after block');
    }
}`;
      parseAndWalk(code);
      const ranges = listener.getResult();
      const blockRange = ranges.find((r) => r.kind === FoldingRangeKind.Block);
      const methodRange = ranges.find(
        (r) => r.kind === FoldingRangeKind.Method,
      );

      expect(blockRange).toBeDefined();
      expect(blockRange?.startLine).toBe(3);
      expect(blockRange?.endLine).toBe(5);

      expect(methodRange).toBeDefined();
      expect(methodRange?.startLine).toBe(6);
      expect(methodRange?.endLine).toBe(8);
    });
  });

  describe('Control structure folding', () => {
    it('should create folding range for if statement', () => {
      const code = `
public class TestClass {
    public void method1() {
        if (true) {
            System.debug('test');
        }
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.IfStatement);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(4);
      expect(range?.endLine).toBe(6);
    });

    it('should create folding range for while statement', () => {
      const code = `
public class TestClass {
    public void method1() {
        while (true) {
            System.debug('test');
        }
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.While);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(4);
      expect(range?.endLine).toBe(6);
    });

    it('should create folding range for for statement', () => {
      const code = `
public class TestClass {
    public void method1() {
        for (Integer i = 0; i < 10; i++) {
            System.debug('test');
        }
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.For);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(4);
      expect(range?.endLine).toBe(6);
    });
  });

  describe('Try-catch folding', () => {
    it('should create folding range for try-catch block', () => {
      const code = `
public class TestClass {
    public void method1() {
        try {
            System.debug('test');
        } catch (Exception e) {
            System.debug(e);
        }
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.TryCatch);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(4);
      expect(range?.endLine).toBe(8);
    });
  });

  describe('Switch statement folding', () => {
    it('should create folding range for switch statement', () => {
      const code = `
public class TestClass {
    public void method1() {
        switch on someVar {
            when 1 {
                System.debug('1');
            }
            when else {
                System.debug('else');
            }
        }
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Switch);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(4);
      expect(range?.endLine).toBe(11);
    });
  });

  describe('Enum folding', () => {
    it('should create folding range for enum declaration', () => {
      const code = `
public enum TestEnum {
    VALUE1,
    VALUE2,
    VALUE3
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Enum);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(2);
      expect(range?.endLine).toBe(6);
    });
  });

  describe('Interface folding', () => {
    it('should create folding range for interface declaration', () => {
      const code = `
public interface TestInterface {
    void method1();
    void method2();
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Interface);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(2);
      expect(range?.endLine).toBe(5);
    });
  });

  describe('Trigger folding', () => {
    it('should create folding range for trigger declaration', () => {
      const code = `
trigger TestTrigger on Account (before insert) {
    // trigger body
    System.debug('test');
}`;
      const inputStream = CharStreams.fromString(code);
      const lexer = new ApexLexer(inputStream);
      const tokenStream = new CommonTokenStream(lexer);
      const parser = new ApexParser(tokenStream);
      const walker = new ParseTreeWalker();
      walker.walk(listener, parser.triggerUnit());

      const range = findRangeByKind(FoldingRangeKind.Trigger);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(2);
      expect(range?.endLine).toBe(5);
    });
  });

  describe('Multiline statement folding', () => {
    it('should create folding range for multiline statement', () => {
      const code = `
public class TestClass {
    public void method1() {
        String longString = 'This is a very long string ' +
            'that spans multiple lines ' +
            'for testing purposes';
    }
}`;
      parseAndWalk(code);
      const range = findRangeByKind(FoldingRangeKind.Statement);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(4);
      expect(range?.endLine).toBe(6);
    });

    it('should create folding range for multiline SOQL query', () => {
      const code = `
public class TestClass {
    public void method1() {
        Lead l = [select id from Lead 
            where isConverted=false limit 1
        ];
    }
}`;
      const inputStream = CharStreams.fromString(code);
      const lexer = new ApexLexer(inputStream);
      const tokenStream = new CommonTokenStream(lexer);
      const parser = new ApexParser(tokenStream);
      const walker = new ParseTreeWalker();
      walker.walk(listener, parser.compilationUnit());

      const range = findRangeByKind(FoldingRangeKind.Statement);
      expect(range).toBeDefined();
      expect(range?.startLine).toBe(4);
      expect(range?.endLine).toBe(6);
    });
  });

  describe('Nested folding ranges', () => {
    it('should handle nested code blocks with correct levels', () => {
      const code = `
public class TestClass {
    public void method1() {
        if (true) {
            while (true) {
                System.debug('test');
            }
        }
    }
}`;
      parseAndWalk(code);
      const ranges = listener.getResult();

      const methodRange = ranges.find(
        (r) => r.kind === FoldingRangeKind.Method,
      );
      const ifRange = ranges.find(
        (r) => r.kind === FoldingRangeKind.IfStatement,
      );
      const whileRange = ranges.find((r) => r.kind === FoldingRangeKind.While);

      expect(methodRange?.level).toBe(0);
      expect(ifRange?.level).toBe(1);
      expect(whileRange?.level).toBe(2);
    });
  });
});
