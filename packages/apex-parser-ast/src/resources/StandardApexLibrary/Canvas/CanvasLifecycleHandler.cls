/**
 * Implement this interface to control context information and add custom behavior during the application render phase.
 */
global interface CanvasLifecycleHandler {

  Set<Canvas.ContextTypeEnum> excludeContextTypes();

  void onRender(Canvas.RenderContext renderContext);

}