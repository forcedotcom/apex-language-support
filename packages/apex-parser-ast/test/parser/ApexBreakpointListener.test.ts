/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexBreakpointListener } from '../../src/parser/listeners/ApexBreakpointListener';

describe('ApexBreakpointListener', () => {
  it('collects executable leaves and condition-bearing control-flow headers', () => {
    const listener = new ApexBreakpointListener();
    new CompilerService().compile(
      [
        'public class Example {',
        '  void run(Boolean condition) {',
        '    if (condition) {',
        '      Integer value = 1;',
        '    } else {',
        '      System.debug(value);',
        '    }',
        '  }',
        '}',
      ].join('\n'),
      'file:///Example.cls',
      listener,
      { includeComments: false },
    );

    expect(listener.getResult()).toEqual([3, 4, 6]);
  });

  it('excludes structural try and catch containers', () => {
    const listener = new ApexBreakpointListener();
    new CompilerService().compile(
      [
        'public class Example {',
        '  void run() {',
        '    try {',
        '      throw new Exception();',
        '    } catch (Exception error) {',
        '      System.debug(error);',
        '    } finally {',
        '      return;',
        '    }',
        '  }',
        '}',
      ].join('\n'),
      'file:///Example.cls',
      listener,
      { includeComments: false },
    );

    expect(listener.getResult()).toEqual([4, 6, 8]);
  });

  it('collects DML, loops, runAs, switch, and transfer statements', () => {
    const listener = new ApexBreakpointListener();
    new CompilerService().compile(
      [
        'public class Example {',
        '  void run(List<Account> accounts) {',
        '    while (!accounts.isEmpty()) {',
        '      break;',
        '    }',
        '    for (Integer i = 0; i < 1; i++) {',
        '      continue;',
        '    }',
        '    do {',
        '      System.debug(accounts.size());',
        '    } while (false);',
        '    insert accounts;',
        '    update accounts;',
        '    delete accounts;',
        '    undelete accounts;',
        '    upsert accounts;',
        '    System.runAs(new User(Id = UserInfo.getUserId())) {',
        '      System.debug(accounts);',
        '    }',
        '    switch on accounts.size() {',
        '      when 0 {',
        '        return;',
        '      }',
        '      when else {',
        '        throw new Exception();',
        '      }',
        '    }',
        '  }',
        '}',
      ].join('\n'),
      'file:///Example.cls',
      listener,
      { includeComments: false },
    );

    expect(listener.getResult()).toEqual([
      3, 4, 6, 7, 9, 10, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 24, 25,
    ]);
  });

  it('collects executable statements in a trigger body', () => {
    const listener = new ApexBreakpointListener();
    new CompilerService().compile(
      [
        'trigger AccountTrigger on Account (before insert) {',
        '  for (Account account : Trigger.new) {',
        "    account.Description = 'new';",
        '  }',
        '}',
      ].join('\n'),
      'file:///AccountTrigger.trigger',
      listener,
      { includeComments: false },
    );

    expect(listener.getResult()).toEqual([2, 3]);
  });

  it('does not treat multiline comments as executable lines', () => {
    const listener = new ApexBreakpointListener();
    new CompilerService().compile(
      [
        'public class CommentBreakpoints {',
        '  void run() {',
        '    /*',
        '     * comments are not executable',
        '     */',
        '    Boolean enabled = true;',
        '    System.debug(enabled);',
        '  }',
        '}',
      ].join('\n'),
      'file:///CommentBreakpoints.cls',
      listener,
      { includeComments: false },
    );

    expect(listener.getResult()).toEqual([6, 7]);
  });

  it('collects executable accessor bodies but not accessor declarations', () => {
    const listener = new ApexBreakpointListener();
    new CompilerService().compile(
      [
        'public class AccessorBreakpoints {',
        '  public String value {',
        '    get {',
        "      return 'value';",
        '    }',
        '    set {',
        '      System.debug(value);',
        '    }',
        '  }',
        '}',
      ].join('\n'),
      'file:///AccessorBreakpoints.cls',
      listener,
      { includeComments: false },
    );

    expect(listener.getResult()).toEqual([4, 7]);
  });

  it('uses the first grammar line for multiline control flow and switch branches', () => {
    const listener = new ApexBreakpointListener();
    new CompilerService().compile(
      [
        'public class ControlFlowBreakpoints {',
        '  void run(Integer value) {',
        '    if (',
        '      value == 1',
        '    ) {',
        '      System.debug(value);',
        '    }',
        '    switch on value {',
        '      when 1 {',
        '        System.debug(1);',
        '      }',
        '      when else {',
        '        System.debug(0);',
        '      }',
        '    }',
        '  }',
        '}',
      ].join('\n'),
      'file:///ControlFlowBreakpoints.cls',
      listener,
      { includeComments: false },
    );

    expect(listener.getResult()).toEqual([3, 6, 8, 9, 10, 12, 13]);
  });

  it('returns only parser-confirmed locations for incomplete source', () => {
    const listener = new ApexBreakpointListener();
    new CompilerService().compile(
      [
        'public class IncompleteBreakpoints {',
        '  void run(Boolean condition) {',
        '    if (condition) {',
        '      Integer value = 1;',
      ].join('\n'),
      'file:///IncompleteBreakpoints.cls',
      listener,
      { includeComments: false },
    );

    expect(listener.getResult()).toEqual([3, 4]);
  });
});
