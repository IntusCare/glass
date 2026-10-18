  # gstack
  if [ -d ~/gstack/.git ]; then git -C ~/gstack pull --ff-only; else git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/gstack; fi
  (cd ~/gstack && ./setup --host auto && ./setup --status)

  # impeccable + mattpocock skills. Run these from $HOME, not ~/gstack: gstack's
  # package.json declares sharp as both a dependency and an override, and npm
  # refuses to run npx inside such a project ("EOVERRIDE ... conflicts with
  # direct dependency"). Flags make both installers non-interactive.
  cd ~
  npx -y impeccable install -y --global --providers=claude
  npx -y skills@latest add mattpocock/skills --skill setup-matt-pocock-skills -g -y