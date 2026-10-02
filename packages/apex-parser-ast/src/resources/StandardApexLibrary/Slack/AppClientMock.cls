global virtual class AppClientMock extends Slack.AppClient implements Slack.AppClientInterface {
    global Object AppClientMock() { return null; }

    global virtual Slack.AppsEventAuthorizationsListResponse appsEventAuthorizationsList(Slack.AppsEventAuthorizationsListRequest req) { return null; }

    global virtual Slack.AuthTestResponse authTest(Slack.AuthTestRequest req) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}