Pod::Spec.new do |s|
  s.name = 'BlixtBiometrics'
  s.version = '1.0.0'
  s.summary = 'Blixt macOS Touch ID authentication'
  s.homepage = 'https://github.com/smolcars/blixt-wallet'
  s.license = 'MIT'
  s.author = 'Blixt Wallet contributors'
  s.source = { :git => 'https://github.com/smolcars/blixt-wallet.git' }
  s.osx.deployment_target = '14.0'
  s.source_files = 'native/**/*.{h,m,mm}'
  s.frameworks = 'LocalAuthentication'
  install_modules_dependencies(s)
end
