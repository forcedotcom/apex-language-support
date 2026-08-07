// Fixture for textDocument/rename e2e (W-23631082). Kept under 30 lines to
// fit in Monaco viewport on CI. Tests LOCAL variables + PARAMETERS only.
public with sharing class RenameLocalSample {
    // Local variable `total` used 4x. Proves multi-occurrence rename.
    public Integer compute() {
        Integer total = 0;
        total = total + 1;
        total = total + 2;
        return total;
    }

    // Sibling same-named local. Proves scope-aware rename does NOT leak.
    public Integer computeOther() {
        Integer total = 100;
        return total;
    }

    // Parameter `value`. Parameters are renameLocal targets alongside locals.
    public Integer addValue(Integer value) {
        Integer result = value + 10;
        return result;
    }
}
