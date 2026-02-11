/**
 * Standalone valid class for DiagnosticProcessingService tests.
 * No extends/implements to avoid missing-type errors; no variable shadowing.
 */
global class TestClass {
  public static String getStaticValue() {
    return 'test';
  }

  public Integer getValue() {
    return 42;
  }

  public static void testStatic() {
    getStaticValue();
  }

  public void testInstance() {
    getValue();
  }

  public void testTypeContext() {
    Integer val = getValue();
  }

  public static void testIntegration() {
    String val = getStaticValue();
  }

  public void testKeywordDetection() {
    if (true) {
    }
    for (Integer i = 0; i < 10; i++) {
    }
  }
}
