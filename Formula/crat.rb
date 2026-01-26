class Crat < Formula
  desc "Solana Vanity Address Generator CLI"
  homepage "https://github.com/asticrat/crat"
  url "https://registry.npmjs.org/crat-cli/-/crat-cli-1.0.3.tgz"
  sha256 "ed298dbef6a2c6c915a0149cf506b95a266f5278103d14763bf9c0bda770eff8"
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
