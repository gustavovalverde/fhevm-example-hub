export type DeployArg =
  | { ref: string }
  | { signer: "deployer" }
  | { literal: string }
  | { value: number }
  | { expr: string };

export type DeployStep = {
  contract: string;
  args?: DeployArg[];
  saveAs?: string;
  afterDeploy?: string[];
};

export interface DeployScriptConfig {
  contract: string;
  deployContracts?: string[];
  deployPlan?: DeployStep[];
}

function toVarName(contractName: string): string {
  const base = contractName.replace(/\.sol$/u, "");
  return base.charAt(0).toLowerCase() + base.slice(1);
}

function resolveVarName(ref: string, varNames: Map<string, string>): string {
  return varNames.get(ref) ?? varNames.get(ref.replace(/\.sol$/u, "")) ?? ref;
}

function renderArg(arg: DeployArg, varNames: Map<string, string>): string {
  if ("ref" in arg) {
    const varName = resolveVarName(arg.ref, varNames);
    return `await ${varName}.getAddress()`;
  }
  if ("signer" in arg) {
    return `${arg.signer}.address`;
  }
  if ("literal" in arg) {
    return JSON.stringify(arg.literal);
  }
  if ("value" in arg) {
    return String(arg.value);
  }
  return arg.expr;
}

function normalizePlan(config: DeployScriptConfig): DeployStep[] {
  if (config.deployPlan && config.deployPlan.length > 0) {
    return config.deployPlan;
  }
  if (config.deployContracts && config.deployContracts.length > 0) {
    return config.deployContracts.map((contract) => ({ contract }));
  }
  return [{ contract: config.contract.replace(/\.sol$/u, "") }];
}

export function generateDeployScriptForExample(
  _exampleName: string,
  config: DeployScriptConfig,
): string {
  const plan = normalizePlan(config);
  const varNames = new Map<string, string>();

  for (const step of plan) {
    const contractName = step.contract.replace(/\.sol$/u, "");
    const varName = step.saveAs ?? toVarName(contractName);
    varNames.set(step.contract, varName);
    varNames.set(contractName, varName);
  }

  const deployments = plan
    .map((step) => {
      const contractName = step.contract.replace(/\.sol$/u, "");
      const varName = resolveVarName(contractName, varNames);
      const factoryName = `${varName}Factory`;
      const args = (step.args ?? []).map((arg) => renderArg(arg, varNames)).join(", ");
      const deployArgs = args.length > 0 ? `(${args})` : "()";
      const afterDeploy = (step.afterDeploy ?? []).map((line) => `  ${line}`).join("\n");

      return `  const ${factoryName} = await hre.ethers.getContractFactory("${contractName}");
  const ${varName} = await ${factoryName}.deploy${deployArgs};
  await ${varName}.waitForDeployment();

  console.log("${contractName} deployed to:", await ${varName}.getAddress());
${afterDeploy ? `\n${afterDeploy}` : ""}`;
    })
    .join("\n\n");

  return `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

${deployments.trimEnd()}
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;
}
