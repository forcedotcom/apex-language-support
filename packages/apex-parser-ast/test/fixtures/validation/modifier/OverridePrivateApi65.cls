/**
 * API 65+: override methods require protected, public, or global.
 * Inner class overrides parent method with default visibility.
 */
public virtual class OverridePrivateApi65 {
  public virtual void overridable() {
  }

  public class Child extends OverridePrivateApi65 {
    override void overrideDefault() {
    }
  }
}
