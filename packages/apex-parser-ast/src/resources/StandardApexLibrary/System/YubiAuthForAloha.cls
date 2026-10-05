global class YubiAuthForAloha {
    global YubiAuthForAloha() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    global static Boolean validateYubiKeyLogin(String username, String password) { return false; }
}