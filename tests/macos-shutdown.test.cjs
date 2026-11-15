const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
test('native shutdown waits for status zero, skips locked LND, and times out', {skip: process.platform !== 'darwin', timeout: 30000}, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blixt-shutdown-'));
  try {
    // Compile the actual coordinator with a fake LND and no React runtime.
    let source = fs.readFileSync(path.join(__dirname, '../macos/BlixtWallet/BlixtLndShutdown.mm'), 'utf8')
      .replace('#import <React/RCTBridgeModule.h>', '')
      .replace('#import <React-RCTAppDelegate/RCTRootViewFactory.h>', '')
      .replace('#import <ReactCommon/RCTHost.h>', '')
      .replace('#include "macos/Lndmobile.xcframework/macos-arm64_x86_64/Headers/liblnd.h"', '')
      .replace('<RCTBridgeModule>', '')
      .replace('RCT_EXPORT_MODULE()', '')
      .replace('RCT_EXPORT_METHOD(setRpcReady:(BOOL)ready)', '- (void)setRpcReady:(BOOL)ready');
    const preamble = `#import <Foundation/Foundation.h>
#include <atomic>
@interface RCTHost : NSObject
@property(copy) dispatch_block_t completion;
- (void)invalidateWithCompletion:(dispatch_block_t)completion;
@end
@implementation RCTHost
- (void)invalidateWithCompletion:(dispatch_block_t)completion { self.completion = completion; }
@end
@interface RCTRootViewFactory : NSObject
@property RCTHost *reactHost;
@end
@implementation RCTRootViewFactory
@end
static std::atomic_int status{1};
static std::atomic_int requests{0};
typedef struct { void (*onResponse)(void*, const char*, int); void (*onError)(void*, const char*); uintptr_t responseContext; uintptr_t errorContext; } CCallback;
static int getStatus() { return status.load(); }
static void lndFree(void*) {}
static void stopDaemon(char*, int, CCallback callback) { requests++; callback.onResponse(nullptr, nullptr, 0); }
`;
    const main = `
int main() { @autoreleasepool {
  BlixtLndShutdown *module = [BlixtLndShutdown new];
  assert(![BlixtLndShutdown shouldWait]);
  [module setRpcReady:YES]; assert([BlixtLndShutdown shouldWait]);
  __block BOOL done = NO;
  [BlixtLndShutdown shutdownWithCompletion:^{ done = YES; }];
  [[NSRunLoop mainRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.3]];
  assert(requests == 1 && !done); // RPC success is not daemon exit.
  status = 0;
  [[NSRunLoop mainRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.3]];
  assert(done && ![BlixtLndShutdown shouldWait]);
  status = 1; done = NO;
  [BlixtLndShutdown shutdownWithCompletion:^{ done = YES; }];
  [[NSRunLoop mainRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:15.5]];
  assert(done && requests == 2);
  done = NO;
  RCTRootViewFactory *factory = [RCTRootViewFactory new];
  factory.reactHost = [RCTHost new];
  [BlixtLndShutdown stopReact:factory completion:^{ done = YES; }];
  assert(!done); // App exit must wait for runtime teardown acknowledgement.
  factory.reactHost.completion(); assert(done);
  puts("PASS");
} }
`;
    const file = path.join(dir, 'test.mm');
    fs.writeFileSync(file, preamble + source + main);
    execFileSync('xcrun', ['clang++', '-std=c++20', '-fobjc-arc', '-fblocks', '-I', path.join(__dirname, '../macos/BlixtWallet'), file, '-framework', 'Foundation', '-o', path.join(dir, 'test')]);
    assert.match(execFileSync(path.join(dir, 'test'), {encoding:'utf8', timeout:20000}), /PASS/);
  } finally { fs.rmSync(dir, {recursive:true, force:true}); }
});
