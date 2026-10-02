global class CommerceIdentitySynchronizationAction {
    global Object CommerceIdentitySynchronizationAction() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global static Auth.CommerceIdentitySynchronizationAction.UserSynchronizationResult establishUserSynchronization() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    global class UserSynchronizationResult {
        global String errorMessage;
        global Boolean isSuccess;

        global Object UserSynchronizationResult() { return null; }

        global Auth.CommerceIdentitySynchronizationAction.UserSynchronizationResult clone() { return null; }

        global virtual Boolean equals(Object o) { return false; }

        global virtual Integer hashCode() { return 0; }

        global override virtual String toString() { return null; }
    }
}