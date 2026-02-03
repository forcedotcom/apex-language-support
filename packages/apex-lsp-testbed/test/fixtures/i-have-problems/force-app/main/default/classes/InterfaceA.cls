/**
 * Part of circular interface inheritance demonstration
 * InterfaceA extends InterfaceB, which extends InterfaceA (circular)
 */
public interface InterfaceA extends InterfaceB {
    void methodA();
}
