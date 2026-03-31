/**
 * A wrapper interface that is used to retrieve application and environment context information.
 */
global interface RenderContext {

  Canvas.ApplicationContext getApplicationContext();

  Canvas.EnvironmentContext getEnvironmentContext();

}