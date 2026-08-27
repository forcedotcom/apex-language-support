// Fixture for renameField e2e (W-23631087 / 4.3). The instance field `counter`
// is declared once and referenced via this.counter and bare (implicit-this)
// counter, so renaming it exercises the declaration + this-qualified +
// implicit-this occurrence classification end-to-end through F2.
public with sharing class RenameFieldSample {
    public Integer counter = 0;

    public void increment() {
        this.counter = this.counter + 1;
    }

    public Integer readCounter() {
        return counter;
    }
}
