/**
 * Contains methods for automated testing of your Canvas classes.
 */
global class Test {

  global Test() {}

  global static Canvas.RenderContext mockRenderContext(Map<String,String> applicationContextTestValues, Map<String,String> environmentContextTestValues) {}

  global static void testCanvasLifecycle(Canvas.CanvasLifecycleHandler lifecycleHandler, Canvas.RenderContext mockRenderContext) {}

  global Object clone() {}

}