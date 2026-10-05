global class B2CCommerceCloudRegistrationHandler {
    global B2CCommerceCloudRegistrationHandler() { }

    global User createUser(Auth.UserData data) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    global void updateUser(Id userId, Auth.UserData data) { }
}