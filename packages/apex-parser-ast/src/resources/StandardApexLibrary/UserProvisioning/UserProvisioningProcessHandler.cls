global abstract class UserProvisioningProcessHandler {
    global UserProvisioningProcessHandler() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global virtual UserProvisioning.ProvisioningProcessHandlerOutput invoke(UserProvisioning.ProvisioningProcessHandlerInput input) { return null; }

    global override virtual String toString() { return null; }
}