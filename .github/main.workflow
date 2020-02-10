workflow "publish on push" {
  on = "push"
  resolves = ["publish"]
}

action "publish" {
  uses = "actions/npm@master"
  args = "publish"
  secrets = ["NPM_AUTH_TOCKEN"]
}