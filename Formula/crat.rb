class Crat < Formula
  desc "Solana Vanity Address Generator CLI"
  homepage "https://github.com/asticrat/crat"
  url "https://registry.npmjs.org/crat-cli/-/crat-cli-1.1.0.tgz"
  sha256 "443aa38e786c877338caa60eb8a2542f8a1c364e893bfd67fdd6bf02298acf36"
  license "ISC"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/crat", "--help"
  end
end
