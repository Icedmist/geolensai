 { pkgs, ... }: {
  
  # 1. MAKE SURE PYTHON IS INSTALLED
  packages = [
    pkgs.python3
  ];

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
    ];

    # 2. ADD THIS PREVIEW CONFIGURATION BLOCK
    previews = {
      enable = true;
      previews = {
        web = {
          # This command starts a simple server on the correct port
          command = ["python3" "-m" "http.server" "$PORT" "--bind" "0.0.0.0"];
          manager = "web";
        };
      };
    };

  };
}