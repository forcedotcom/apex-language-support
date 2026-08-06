/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Fixture for textDocument/rename e2e tests (W-23631082 / 3.3).
 *
 * Provides local variables with multiple usages in the same method to exercise
 * single-file WorkspaceEdit rename. The renameLocal implementation targets
 * LOCAL variables and method PARAMETERS (not fields/methods/classes), so this
 * fixture must contain symbols of those kinds.
 */
public with sharing class RenameLocalSample {
    /**
     * A method with a local variable (`total`) used multiple times.
     * Multiple usages render reliably in Monaco and prove the multi-occurrence
     * rename (all `total` refs within scope are renamed together).
     */
    public Integer compute() {
        Integer total = 0;
        total = total + 1;
        total = total + 2;
        return total;
    }

    /**
     * A second method with a SIBLING same-named local (`total`), proving
     * scope-aware rename does NOT rename across method boundaries. If
     * compute()'s `total` is renamed, this method's `total` must be untouched.
     */
    public Integer computeOther() {
        Integer total = 100;
        return total;
    }

    /**
     * A method with a PARAMETER (`value`) used within the body. Parameters are
     * the other renameLocal target kind (in addition to locals).
     */
    public Integer addValue(Integer value) {
        Integer result = value + 10;
        return result;
    }
}
