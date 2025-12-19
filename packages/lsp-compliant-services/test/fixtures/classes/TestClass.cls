global class TestClass extends BaseClass implements MyInterface {
  public static String getStaticValue() {
    return 'test';
  }
  
  public Integer getValue() {
    return 42;
  }
  
  public static void testStatic() {
    getStaticValue(); // This should resolve to static method
  }
  
  public void testInstance() {
    getValue(); // This should resolve to instance method
  }
  
  public void testTypeContext() {
    String result = getValue(); // Should resolve to String-returning method
  }
  
  public static void testIntegration() {
    String result = getValue(); // Should resolve to static String method
  }
  
  public void testKeywordDetection() {
    if (true) {
      // Test if keyword detection
    }
    for (Integer i = 0; i < 10; i++) {
      // Test for keyword detection
    }
  }
}
