# Chained Syntax Capture Gaps Analysis

## Overview
Analysis of ANTLR grammar rules that create chained expressions and verification that they are properly captured by listeners.

## Grammar Rules Creating Chains

### 1. ✅ `dotExpression` (Line 468-471)
**Grammar:**
```
expression (DOT | QUESTIONDOT) (dotMethodCall | anyId)
```

**Status:** ✅ **CAPTURED**
- Handled by `enterDotExpression`/`exitDotExpression` in listeners
- Creates chained references with `chainNodes` property
- Supports both `DOT` (`.`) and `QUESTIONDOT` (`?.`) operators

**Note:** QUESTIONDOT (safe navigation `?.`) is handled the same as DOT - this is correct since both create chains. The grammar allows both operators, and listeners treat them identically for chain creation purposes.

---

### 2. ✅ `typeRef` (Line 215-217)
**Grammar:**
```
typeName (DOT typeName)* arraySubscripts
```

**Status:** ✅ **CAPTURED**
- Handled by `enterTypeRef` in listeners
- Creates chained type references using `createChainedTypeReference`
- Used for: return types, parameter types, field types, variable types
- Examples: `System.Url`, `Namespace.ClassName`

---

### 3. ✅ `createdName` (Line 534-536)
**Grammar:**
```
idCreatedNamePair (DOT idCreatedNamePair)*
```

**Used in:** `new` expressions (`NEW creator`)

**Status:** ✅ **CAPTURED**
- **Current behavior:** Creates chained references with `chainNodes` property
- **Implementation:** Updated `createConstructorCallReference` to support `preciseLocations` parameter
- **Chain structure:** 
  - First parts: `NAMESPACE` references
  - Last part: `CONSTRUCTOR_CALL` reference
  - All parts stored in `chainNodes` array on the final reference
- **Example:** `new System.Url()` creates:
  - Chained reference with `chainNodes` containing:
    - `System` → NAMESPACE
    - `Url` → CONSTRUCTOR_CALL
- **Impact:** ✅ Fixed - Constructor calls with dotted names are now captured as unified chains

---

### 4. ⚠️ `qualifiedName` (Line 246-248)
**Grammar:**
```
id (DOT id)*
```

**Used in:**
- Constructor declarations: `qualifiedName formalParameters block` (line 188)
- Annotations: `ATSIGN qualifiedName` (line 262)
- Catch clauses: `CATCH LPAREN modifier* qualifiedName id RPAREN` (line 431)
- Upsert statements: `UPSERT accessLevel? expression qualifiedName? SEMI` (line 403)

**Status:** ⚠️ **PARTIALLY CAPTURED**
- **Catch clauses:** ✅ **CAPTURED** - Updated `enterCatchClause` to create chained references
  - **Implementation:** Updated `createClassReference` to support `preciseLocations` parameter
  - **Chain structure:** First parts are `NAMESPACE`, last part is `CLASS_REFERENCE`
  - **Example:** `catch (Namespace.Exception e)` creates chained reference with `chainNodes`
- **Constructor declarations:** ✅ **NOT APPLICABLE** - Apex rejects dotted names in constructor declarations (semantic error)
- **Annotations:** ❌ **NOT CAPTURED** - Currently not captured as chains (low priority)
- **Upsert statements:** ❌ **NOT CAPTURED** - Currently not captured as chains (low priority)

**Impact:** Low-Medium - Catch clause exception types are now captured as chains. Other uses are lower priority.

---

### 5. ✅ `arrayExpression` (Line 472)
**Grammar:**
```
expression LBRACK expression RBRACK
```

**Status:** ✅ **CAPTURED**
- Handled by `enterArrayExpression` in listeners
- Creates `ARRAY_EXPRESSION` references
- Works with chained expressions: `obj.field[0]` is captured correctly

---

### 6. ❌ `fieldName` (SOQL) (Line 612-613)
**Grammar:**
```
soqlId (DOT soqlId)*
```

**Status:** ❌ **NOT RELEVANT**
- SOQL-specific, not general Apex expressions
- Probably doesn't need chained reference capture

---

### 7. ❌ `soslId` (SOSL) (Line 905-906)
**Grammar:**
```
id (DOT soslId)*
```

**Status:** ❌ **NOT RELEVANT**
- SOSL-specific, not general Apex expressions
- Probably doesn't need chained reference capture

---

## Summary of Gaps

### High Priority
None identified - core chained expression capture is working.

### Medium Priority
✅ **ALL CLOSED** - No remaining medium priority gaps.

### Low Priority

1. **`qualifiedName` in constructor declarations**
   - **Status:** ✅ **NOT APPLICABLE** - Constructor declarations explicitly reject dotted names (semantic error)
   - **Code:** Lines 1597-1603 in ApexSymbolCollectorListener validate that constructor names cannot use qualified names
   - **Note:** This is correct behavior - Apex doesn't allow `public Namespace.ClassName() {}`

2. **`qualifiedName` in catch clauses**
   - **Status:** ✅ **CAPTURED** - Updated to create chained references
   - **Implementation:** Updated `enterCatchClause` in both listeners to extract precise locations and create chained references
   - **Example:** `catch (Namespace.Exception e)` now creates chained reference with `chainNodes`

3. **`qualifiedName` in annotations** (Future consideration)
   - **Status:** ❌ **NOT CAPTURED** - Currently creates single reference
   - **Impact:** Very Low - Annotations are rarely used with dotted names
   - **Example:** `@Namespace.Annotation` - not captured as chain

4. **`qualifiedName` in upsert statements** (Future consideration)
   - **Status:** ❌ **NOT CAPTURED** - Currently creates single reference
   - **Impact:** Very Low - Upsert type names are rarely dotted
   - **Example:** `upsert records Namespace.Type__c` - not captured as chain

## Recommendations

1. ✅ **COMPLETED:** `createdName` chained capture implemented
   - `new System.Url()` now creates chained reference with `chainNodes`
   - Unified constructor call with its type name parts

2. ✅ **COMPLETED:** Exception types in catch clauses now create chained references
   - `catch (Namespace.Exception e)` creates chained reference with `chainNodes`
   - Better semantic analysis for exception types

3. **Future:** Consider capturing `qualifiedName` in annotations and upsert statements
   - Currently low priority as these are rarely used with dotted names
   - Could be addressed if semantic analysis needs improve

4. **Documentation:** Comments added explaining:
   - Why SOQL/SOSL field names don't need chain capture (query-specific, not general expressions)
   - Why constructor declarations reject dotted names (Apex language restriction)

## Test Coverage

To verify these gaps, consider adding tests for:
- `new System.Url()` - verify if it should create chained reference with `chainNodes`
- `catch (Namespace.Exception e)` - verify exception type is captured (currently single reference)
- `obj?.field` - verify safe navigation operator (`?.`) creates chains correctly (should work same as `.`)

## Conclusion

**Core chained expression capture is working well.** All identified gaps have been closed:
- ✅ **`createdName` in constructor calls** - Now creates unified chained references
- ✅ **`qualifiedName` in catch clauses** - Now creates chained type references

The implementation follows the same pattern as `typeRef` chained capture:
- Uses `preciseLocations` parameter to extract individual part locations
- Creates chain nodes with appropriate contexts (NAMESPACE for intermediate parts, CONSTRUCTOR_CALL/CLASS_REFERENCE for final part)
- Attaches `chainNodes` array to the final reference for semantic analysis

**Status:** All medium and high priority gaps are resolved. Remaining gaps (annotations, upsert) are low priority and can be addressed if needed in the future.
